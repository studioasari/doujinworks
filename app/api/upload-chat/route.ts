import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { chatUploadLimiter, safeLimit } from '@/utils/rateLimit'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * チャット画像アップロードAPI
 *
 * チャットルームに画像を送信する際に呼ばれる。
 * サーバー経由で R2 に直接アップロードする（署名URL 方式ではない）。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. auth uid → profiles.id 取得
 *  3. chat_room_participants で当該ルームの参加者であること
 *
 * クライアントから渡される userId パラメータは無視し、
 * サーバー側で profiles.id を使う（改ざん防止）。
 */
export async function POST(request: NextRequest) {
  try {
    // ステップ1: ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // ステップ2: formData パース
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string // roomId

    if (!file || !category) {
      return NextResponse.json(
        { error: '必要なパラメータが不足しています' },
        { status: 400 }
      )
    }

    // ステップ3: profiles.id 取得（auth uid → profiles.id）
    const admin = createAdminClient()
    const { data: myProfile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !myProfile) {
      return NextResponse.json(
        { error: 'プロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // ステップ4: チャットルーム参加者チェック
    // chat_room_participants.user_id は profiles.id を格納している
    const { data: participant, error: participantError } = await admin
      .from('chat_room_participants')
      .select('id')
      .eq('chat_room_id', category)
      .eq('user_id', myProfile.id)
      .maybeSingle()

    if (participantError) {
      console.error('[upload-chat] 参加者チェックエラー:', participantError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    if (!participant) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ5: レート制限
    const { success: withinLimit } = await safeLimit(
      chatUploadLimiter,
      user.id,
      'chatUpload'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ6: ファイルキー生成 + R2 アップロード
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const key = `${category}/${timestamp}-${randomStr}.${fileExt}`

    const bucketName = process.env.R2_BUCKET_CHATS
    if (!bucketName) {
      console.error('[upload-chat] R2_BUCKET_CHATS が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })

    await s3Client.send(command)

    // ステップ7: 成功レスポンス
    return NextResponse.json({
      success: true,
      key,
      bucket: bucketName,
    })
  } catch (error) {
    console.error('[upload-chat] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
