import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { chatSignedUrlLimiter, safeLimit } from '@/utils/rateLimit'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * チャット添付ファイル GET 署名URL 発行API
 *
 * チャットメ��セージに添付されたファイルのダウンロード用
 * 署名URL を発行する。chats バケット専用。
 *
 * 認可:
 *  1. ログイン済み
 *  2. auth uid → profiles.id 取得
 *  3. key から roomId を抽出し、chat_room_participants で参加者チェック
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

    // ステップ2: JSON パース
    let body: { bucket?: unknown; key?: unknown; download?: unknown; fileName?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    // ステップ3: バリデーション
    if (body.bucket !== 'chats') {
      return NextResponse.json(
        { error: '無効なバケット名です' },
        { status: 400 }
      )
    }

    const key = body.key
    if (typeof key !== 'string' || key.length === 0) {
      return NextResponse.json(
        { error: 'key が不正です' },
        { status: 400 }
      )
    }

    // ステップ4: roomId 抽出
    const roomId = key.split('/')[0]
    if (!roomId) {
      return NextResponse.json(
        { error: 'key の形式が不正です' },
        { status: 400 }
      )
    }

    // ステップ5: profiles.id 取得
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

    // ステップ6: チャット参加者チェック
    const { data: participant, error: participantError } = await admin
      .from('chat_room_participants')
      .select('id')
      .eq('chat_room_id', roomId)
      .eq('user_id', myProfile.id)
      .maybeSingle()

    if (participantError) {
      console.error('[r2-signed-url] 参加者チェックエラー:', participantError)
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

    // ステップ7: レート制限
    const { success: withinLimit } = await safeLimit(
      chatSignedUrlLimiter,
      user.id,
      'chatSignedUrl'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ8: GET 署名URL 発行
    const bucketName = process.env.R2_BUCKET_CHATS
    if (!bucketName) {
      console.error('[r2-signed-url] R2_BUCKET_CHATS が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ...(body.download && typeof body.fileName === 'string' && body.fileName.length > 0
        ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(body.fileName)}"` }
        : {}),
    })
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // ステップ9: 成功レスポンス（既存形式を維持）
    return NextResponse.json({
      success: true,
      signedUrl,
    })

  } catch (error) {
    console.error('[r2-signed-url] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
