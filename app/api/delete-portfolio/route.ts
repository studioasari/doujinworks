import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2PortfolioClient } from '@/lib/r2-upload'
import { createClient } from '@/utils/supabase/server'

/**
 * ポートフォリオ画像削除API
 *
 * R2 上のポートフォリオ画像ファイルを削除する。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. 削除対象ファイルのパスにログインユーザーの auth uid が
 *     パスセグメントとして含まれていること（所有者確認）
 *
 * 所有者判定の仕組み:
 *  R2 のファイルパスは lib/r2-upload.ts の getUploadUrl() で
 *  "{category}/{auth_uid}/{timestamp}.{ext}" の形式で組み立てられる。
 *  全カテゴリで auth uid がパスに含まれるため、パスセグメントに
 *  user.id が存在するかで所有者を判定できる。
 *
 *  注意: ここでは profiles.id ではなく auth uid (user.id) を使う。
 *  これは R2 パスが auth uid で組み立てられているため。
 *  /api/payments/create 等では profiles.id を使うが、設計が異なる。
 */
export async function DELETE(request: NextRequest) {
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

    // ステップ2: リクエストボディのバリデーション
    let body: { filePath?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    const filePath = body.filePath
    if (typeof filePath !== 'string' || filePath.length === 0) {
      return NextResponse.json(
        { error: 'filePath が不正です' },
        { status: 400 }
      )
    }

    // ステップ3: 所有者確認（パスセグメント検証）
    // R2 パスは "{category}/{auth_uid}/{timestamp}.{ext}" の形式。
    // パスを '/' で分割して、ログインユーザーの auth uid が
    // セグメントとして含まれているかを検証する。
    // split('/').includes() で比較することで、ファイル名に
    // たまたま他人の ID が含まれる偶然の一致を防ぐ。
    const pathSegments = filePath.split('/')
    if (!pathSegments.includes(user.id)) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ4: R2 ファイル削除
    const bucketName = process.env.R2_BUCKET_PORTFOLIO

    if (!bucketName) {
      console.error('[delete-portfolio] R2_BUCKET_PORTFOLIO が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: filePath
    })

    await r2PortfolioClient.send(command)

    // ステップ5: 成功レスポンス
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[delete-portfolio] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
