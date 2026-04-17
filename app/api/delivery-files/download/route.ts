import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2DeliveriesClient } from '@/lib/r2-upload'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deliveryDownloadLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 納品ファイル ダウンロード署名URL発行API
 *
 * delivery_files.id を受け取り、R2 の GET 署名URL を返す。
 * ダウンロード時のファイル名は original_filename を
 * RFC 5987 準拠の ResponseContentDisposition で指定する。
 *
 * 認可:
 *  1. ログイン済み
 *  2. 契約の当事者（依頼者 or 受注者）
 *  3. 対象ファイルが削除済みでないこと
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
      .select('id, r2_key, original_filename, work_contract_id, deleted_at')
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
        { error: 'このファイルは削除済みです' },
        { status: 404 }
      )
    }

    // ステップ6: 契約取得（当事者チェック用）
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select(`
        contractor_id,
        work_request:work_requests!work_request_id (
          requester_id
        )
      `)
      .eq('id', file.work_contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ7: 当事者チェック（依頼者 or 受注者）
    const workRequest = contract.work_request as
      | { requester_id: string }
      | { requester_id: string }[]
      | null
    const requesterId = Array.isArray(workRequest)
      ? workRequest[0]?.requester_id
      : workRequest?.requester_id

    const isContractor = contract.contractor_id === myProfile.id
    const isRequester = requesterId === myProfile.id

    if (!isContractor && !isRequester) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ8: レート制限
    const { success: withinLimit } = await safeLimit(
      deliveryDownloadLimiter,
      user.id,
      'deliveryDownload'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ9: GET 署名URL 発行
    const bucketName = process.env.R2_BUCKET_DELIVERIES
    if (!bucketName) {
      console.error('[delivery-files/download] R2_BUCKET_DELIVERIES が未設定')
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // RFC 5987 準拠の ResponseContentDisposition
    // filename: ASCII フォールバック（非 ASCII を _ に置換）
    // filename*: UTF-8 エンコード版（モダンブラウザが優先使用）
    const asciiFilename = file.original_filename.replace(/[^\x20-\x7E]/g, '_')
    const encodedFilename = encodeURIComponent(file.original_filename)
    const disposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: file.r2_key,
      ResponseContentDisposition: disposition,
    })

    const signedUrl = await getSignedUrl(r2DeliveriesClient, command, {
      expiresIn: 3600,
    })

    // ステップ10: 成功レスポンス
    return NextResponse.json({
      signedUrl,
      filename: file.original_filename,
    })

  } catch (error) {
    console.error('[delivery-files/download] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
