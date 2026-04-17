import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2PortfolioClient } from '@/lib/r2-upload'
import { createClient } from '@/utils/supabase/server'
import { portfolioUploadLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * ポートフォリオ等アップロード用 署名付きURL発行API
 *
 * ポートフォリオ画像、プロフィール画像、料金表画像の
 * R2 PUT 署名URL を発行する。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. filePath のパスセグメントにログインユーザーの auth uid が
 *     含まれていること（所有者確認、delete-portfolio と同じ方式）
 *
 * 許可バケット: portfolio, profiles, pricing
 * ※ deliveries は /api/upload-delivery を使うため除外
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
    let body: { filePath?: unknown; contentType?: unknown; bucket?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    const filePath = body.filePath
    const contentType = body.contentType
    const bucket = body.bucket

    if (typeof filePath !== 'string' || filePath.length === 0) {
      return NextResponse.json(
        { error: 'filePath が不正です' },
        { status: 400 }
      )
    }

    if (typeof contentType !== 'string' || contentType.length === 0) {
      return NextResponse.json(
        { error: 'contentType が不正です' },
        { status: 400 }
      )
    }

    // ステップ3: 所有者確認（パスセグメント検証）
    // delete-portfolio と同じ方式。filePath は lib/r2-upload.ts の
    // getUploadUrl() で "{category}/{auth_uid}/{timestamp}.{ext}" の
    // 形式で組み立てられるため、auth uid がセグメントに含まれている。
    const pathSegments = filePath.split('/')
    if (!pathSegments.includes(user.id)) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ4: レート制限
    const { success: withinLimit } = await safeLimit(
      portfolioUploadLimiter,
      user.id,
      'portfolioUpload'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ5: バケット名を選択（deliveries は除外）
    let bucketName: string | undefined
    let publicUrl: string

    switch (bucket) {
      case 'profiles':
        bucketName = process.env.R2_BUCKET_PROFILES
        publicUrl = process.env.R2_PUBLIC_URL_PROFILES || process.env.R2_ENDPOINT!
        break
      case 'pricing':
        bucketName = process.env.R2_BUCKET_PRICING
        publicUrl = process.env.R2_PUBLIC_URL_PRICING || process.env.R2_ENDPOINT!
        break
      case 'portfolio':
      default:
        bucketName = process.env.R2_BUCKET_PORTFOLIO
        publicUrl = process.env.R2_PUBLIC_URL_PORTFOLIO || process.env.R2_ENDPOINT!
        break
    }

    if (!bucketName) {
      console.error('[upload-portfolio] バケットが未設定:', bucket)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // ステップ6: 署名付きURL生成（15分有効）
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filePath,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(r2PortfolioClient, command, {
      expiresIn: 900,
    })

    const fileUrl = `${publicUrl}/${filePath}`

    // ステップ7: 成功レスポンス
    return NextResponse.json({ uploadUrl, fileUrl })

  } catch (error) {
    console.error('[upload-portfolio] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
