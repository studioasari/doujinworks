import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { chatSignedUrlBatchLimiter, safeLimit } from '@/utils/rateLimit'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * チャット添付ファイル 一括 GET 署名URL 発行API
 *
 * チャットルーム内の添付画像を一括表示するための署名URL を
 * まとめて発行する。chats バケット専用。
 *
 * 認可:
 *  1. ログイン済み
 *  2. auth uid → profiles.id 取得
 *  3. 全 keys から roomId を抽出し、同一ルームであることを検証
 *  4. chat_room_participants で参加者チェック（1回）
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
    let body: { bucket?: unknown; keys?: unknown }
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

    const keys = body.keys
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: 'keys が不正です' },
        { status: 400 }
      )
    }

    // 最大50件
    const limitedKeys: string[] = keys
      .filter((k): k is string => typeof k === 'string' && k.length > 0)
      .slice(0, 50)

    if (limitedKeys.length === 0) {
      return NextResponse.json(
        { error: 'keys が不正です' },
        { status: 400 }
      )
    }

    // ステップ4: 全 keys が同一ルーム配下であることを検証
    const roomIds = new Set(limitedKeys.map(k => k.split('/')[0]))
    if (roomIds.size !== 1) {
      return NextResponse.json(
        { error: '異なるルームの keys が混在しています' },
        { status: 400 }
      )
    }
    const roomId = [...roomIds][0]
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

    // ステップ6: チャット参加者チェック（1回）
    const { data: participant, error: participantError } = await admin
      .from('chat_room_participants')
      .select('id')
      .eq('chat_room_id', roomId)
      .eq('user_id', myProfile.id)
      .maybeSingle()

    if (participantError) {
      console.error('[r2-signed-url-batch] 参加者チェックエラー:', participantError)
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
      chatSignedUrlBatchLimiter,
      user.id,
      'chatSignedUrlBatch'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ8: 並列で GET 署名URL 発行
    const bucketName = process.env.R2_BUCKET_CHATS
    if (!bucketName) {
      console.error('[r2-signed-url-batch] R2_BUCKET_CHATS が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    const results = await Promise.all(
      limitedKeys.map(async (key) => {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
          const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
          return { key, signedUrl }
        } catch (error) {
          console.error(`[r2-signed-url-batch] 署名URL生成エラー (${key}):`, error)
          return { key, signedUrl: null }
        }
      })
    )

    const urlMap: { [key: string]: string } = {}
    results.forEach(({ key, signedUrl }) => {
      if (signedUrl) urlMap[key] = signedUrl
    })

    // ステップ9: 成功レスポンス（既存形式を維持）
    return NextResponse.json({ urls: urlMap })

  } catch (error) {
    console.error('[r2-signed-url-batch] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
