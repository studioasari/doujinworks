import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2DeliveriesClient } from '@/lib/r2-upload'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deliveryDeleteLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 納品ファイル削除API
 *
 * delivery_files.id を受け取り、R2 から実ファイルを削除し、
 * DB でソフトデリート（deleted_at を設定）する。
 *
 * 認可:
 *  1. ログイン済み
 *  2. アップロード者（uploaded_by）本人のみ
 *     （依頼者は削除不可、受注者＝アップロード者のみ）
 *  3. 対象ファイルが削除済みでないこと
 *
 * エラー時の整合性:
 *  - R2 削除失敗 → DB 更新しない → 500
 *  - R2 削除成功 → DB 更新失敗 → orphan（R2 にない行が残る）
 *    → console.error でログ、cron で将来対応
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    let body: { fileId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    // ステップ3: fileId バリデーション
    const fileId = body.fileId
    if (typeof fileId !== 'string' || !UUID_PATTERN.test(fileId)) {
      return NextResponse.json(
        { error: 'fileId が不正です' },
        { status: 400 }
      )
    }

    // ステップ4: profiles.id 取得
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

    // ステップ5: delivery_files 取得
    const { data: file, error: fileError } = await admin
      .from('delivery_files')
      .select('id, r2_key, uploaded_by, deleted_at')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      )
    }

    if (file.deleted_at !== null) {
      return NextResponse.json(
        { error: 'このファイルは既に削除済みです' },
        { status: 404 }
      )
    }

    // ステップ6: アップロード者チェック（本人のみ）
    if (file.uploaded_by !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ7: レート制限
    const { success: withinLimit } = await safeLimit(
      deliveryDeleteLimiter,
      user.id,
      'deliveryDelete'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ8: R2 からファイル削除
    const bucketName = process.env.R2_BUCKET_DELIVERIES
    if (!bucketName) {
      console.error('[delivery-files/delete] R2_BUCKET_DELIVERIES が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: file.r2_key,
      })
      await r2DeliveriesClient.send(command)
    } catch (r2Error) {
      console.error('[delivery-files/delete] R2 削除エラー:', r2Error)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // ステップ9: DB ソフトデリート（R2 削除済みなので失敗してもファイルは既に消えている）
    const { error: updateError } = await admin
      .from('delivery_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId)

    if (updateError) {
      // R2 は削除済みだが DB 更新に失敗。orphan 状態。
      // cron の自動削除処理で deleted_at が NULL の行を検知して対処する（将来タスク）。
      console.error('[delivery-files/delete] DB ソフトデリート失敗（R2 は削除済み）:', updateError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // ステップ10: 成功レスポンス
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[delivery-files/delete] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
