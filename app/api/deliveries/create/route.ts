import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deliveryCreateLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 納品レコード作成API
 *
 * クリエイターが「納品する」ボタンを押したときに呼ばれる。
 * フェーズ3 の /api/upload-delivery で R2 に直接アップロード済みの
 * ファイル群を、DB に関連付けて納品を確定する。
 *
 * 処理フロー:
 *  1. work_deliveries INSERT（id = クライアント生成の deliveryId を明示指定）
 *  2. delivery_files INSERT × N（バルク、ファイルがあれば）
 *  3. work_contracts UPDATE（status='delivered'、delivered_at 上書き）
 *  4. 依頼者への通知（失敗しても 500 は返さない）
 *
 * 認可:
 *  1. ログイン済み
 *  2. 対象 work_contract の受注者（contractor_id）本人
 *  3. 契約ステータスが 'paid' または 'delivered'（再納品可）
 *
 * ロールバック:
 *  supabase-js には真のトランザクションがないため、手動ロールバック。
 *  delivery_files は work_deliveries への FK に ON DELETE CASCADE を
 *  設定済みなので、work_deliveries を DELETE すれば自動で消える。
 *
 * R2 ファイルはロールバックしない（orphan として残る、将来の別タスク）。
 */

// 500MB
const MAX_FILE_SIZE = 524288000

// UUID v1-v5 どの版でも通す形式チェック
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type FilePayload = {
  r2Key: string
  originalFilename: string
  fileSize: number
  mimeType: string
}

// 個別ファイルのバリデーション。問題があればエラーメッセージを返す、OK なら null。
function validateFile(file: unknown, expectedPrefix: string): string | null {
  if (typeof file !== 'object' || file === null) {
    return 'ファイル情報が不正です'
  }
  const f = file as Record<string, unknown>

  if (typeof f.r2Key !== 'string' || f.r2Key.length === 0) {
    return 'r2Key が不正です'
  }
  if (!f.r2Key.startsWith(expectedPrefix)) {
    return '不正なファイルキーです'
  }
  if (typeof f.originalFilename !== 'string'
      || f.originalFilename.length === 0
      || f.originalFilename.length > 255) {
    return 'ファイル名が不正です'
  }
  if (typeof f.fileSize !== 'number'
      || !Number.isFinite(f.fileSize)
      || !Number.isInteger(f.fileSize)
      || f.fileSize <= 0
      || f.fileSize > MAX_FILE_SIZE) {
    return 'ファイルサイズが不正です'
  }
  if (typeof f.mimeType !== 'string' || f.mimeType.length === 0) {
    return 'MIME type が不正です'
  }
  return null
}

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
    let body: {
      contractId?: unknown
      deliveryId?: unknown
      message?: unknown
      deliveryUrl?: unknown
      files?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'リクエストが不正です' },
        { status: 400 }
      )
    }

    // ステップ3: バリデーション
    const contractId = body.contractId
    const deliveryId = body.deliveryId
    const message = body.message
    const rawDeliveryUrl = body.deliveryUrl
    const rawFiles = body.files

    if (typeof contractId !== 'string' || !UUID_PATTERN.test(contractId)) {
      return NextResponse.json(
        { error: 'contractId が不正です' },
        { status: 400 }
      )
    }

    if (typeof deliveryId !== 'string' || !UUID_PATTERN.test(deliveryId)) {
      return NextResponse.json(
        { error: 'deliveryId が不正です' },
        { status: 400 }
      )
    }

    if (typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが不正です' },
        { status: 400 }
      )
    }
    const trimmedMessage = message.trim()
    if (trimmedMessage.length === 0 || trimmedMessage.length > 1000) {
      return NextResponse.json(
        { error: 'メッセージは1〜1000文字で入力してください' },
        { status: 400 }
      )
    }

    // deliveryUrl: null | string。空文字列は null に正規化。
    let deliveryUrl: string | null
    if (rawDeliveryUrl === null || rawDeliveryUrl === undefined) {
      deliveryUrl = null
    } else if (typeof rawDeliveryUrl === 'string') {
      const trimmed = rawDeliveryUrl.trim()
      deliveryUrl = trimmed.length === 0 ? null : trimmed
    } else {
      return NextResponse.json(
        { error: 'deliveryUrl が不正です' },
        { status: 400 }
      )
    }

    // files: 配列、0〜10件
    if (!Array.isArray(rawFiles)) {
      return NextResponse.json(
        { error: 'files が不正です' },
        { status: 400 }
      )
    }
    if (rawFiles.length > 10) {
      return NextResponse.json(
        { error: 'ファイルは最大10件までです' },
        { status: 400 }
      )
    }

    // ファイル0件かつ URL なしは拒否
    if (rawFiles.length === 0 && deliveryUrl === null) {
      return NextResponse.json(
        { error: 'ファイルまたは URL のいずれかが必要です' },
        { status: 400 }
      )
    }

    // 各ファイルの検証（r2Key のプレフィクス検証を含む）
    const expectedPrefix = `deliveries/${contractId}/${deliveryId}/`
    for (const file of rawFiles) {
      const err = validateFile(file, expectedPrefix)
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 })
      }
    }
    const files = rawFiles as FilePayload[]

    // ステップ4: profiles.id 取得（auth uid → profiles.id）
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

    // ステップ5: 契約取得（requester_id と title を JOIN で取得、通知に使う）
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select(`
        id,
        contractor_id,
        status,
        work_request_id,
        work_request:work_requests!work_request_id (
          requester_id,
          title
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ステップ6: 当事者チェック（受注者本人）
    if (contract.contractor_id !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // ステップ7: ステータスチェック
    if (contract.status !== 'paid' && contract.status !== 'delivered') {
      return NextResponse.json(
        { error: '現在この契約では納品できません' },
        { status: 400 }
      )
    }

    // ステップ8: レート制限
    const { success: withinLimit } = await safeLimit(
      deliveryCreateLimiter,
      user.id,
      'deliveryCreate'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // ステップ9-1: work_deliveries INSERT
    //   id を明示指定（クライアント生成の UUID = フェーズ3 で R2 パスに使ったもの）
    const { error: deliveryInsertError } = await admin
      .from('work_deliveries')
      .insert({
        id: deliveryId,
        work_request_id: contract.work_request_id,
        work_contract_id: contractId,
        contractor_id: myProfile.id,
        message: trimmedMessage,
        delivery_url: deliveryUrl,
        status: 'pending',
      })

    if (deliveryInsertError) {
      // PK 重複（23505）= 同じ deliveryId で既に作成済み
      if (deliveryInsertError.code === '23505') {
        return NextResponse.json(
          { error: '既にこの納品IDは使用済みです' },
          { status: 409 }
        )
      }
      console.error('[deliveries/create] work_deliveries INSERT エラー:', deliveryInsertError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // ステップ9-2: delivery_files INSERT（バルク、ファイルがあれば）
    if (files.length > 0) {
      const fileRows = files.map(f => ({
        work_delivery_id: deliveryId,
        work_contract_id: contractId,
        uploaded_by: myProfile.id,
        r2_key: f.r2Key,
        original_filename: f.originalFilename,
        file_size: f.fileSize,
        mime_type: f.mimeType,
      }))

      const { error: filesInsertError } = await admin
        .from('delivery_files')
        .insert(fileRows)

      if (filesInsertError) {
        console.error('[deliveries/create] delivery_files INSERT エラー:', filesInsertError)
        // ロールバック: work_deliveries を DELETE（CASCADE で未コミット分も消える）
        try {
          await admin.from('work_deliveries').delete().eq('id', deliveryId)
        } catch (rollbackError) {
          console.error('[deliveries/create] ロールバック失敗（work_deliveries が残留）:', rollbackError)
        }
        return NextResponse.json(
          { error: 'サーバーエラーが発生しました' },
          { status: 500 }
        )
      }
    }

    // ステップ9-3: work_contracts UPDATE
    //   再納品時も delivered_at は上書き（仕様通り、最新の納品日時にする）
    const { error: contractUpdateError } = await admin
      .from('work_contracts')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (contractUpdateError) {
      console.error('[deliveries/create] work_contracts UPDATE エラー:', contractUpdateError)
      // ロールバック: work_deliveries DELETE（CASCADE で delivery_files も消える）
      try {
        await admin.from('work_deliveries').delete().eq('id', deliveryId)
      } catch (rollbackError) {
        console.error('[deliveries/create] ロールバック失敗（work_deliveries が残留）:', rollbackError)
      }
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    // ステップ10: 依頼者に通知（失敗しても 500 は返さない）
    const workRequest = contract.work_request as
      | { requester_id: string; title: string }
      | { requester_id: string; title: string }[]
      | null
    const requesterId = Array.isArray(workRequest)
      ? workRequest[0]?.requester_id
      : workRequest?.requester_id
    const requestTitle = Array.isArray(workRequest)
      ? workRequest[0]?.title
      : workRequest?.title

    if (requesterId) {
      const { error: notifyError } = await admin
        .from('notifications')
        .insert({
          profile_id: requesterId,
          type: 'delivered',
          title: '納品がありました',
          message: `「${requestTitle ?? ''}」にクリエイターから納品がありました。確認してください。`,
          link: `/requests/${contract.work_request_id}/contracts/${contractId}`,
        })

      if (notifyError) {
        console.error('[deliveries/create] 通知作成エラー:', notifyError)
      }
    }

    // ステップ11: 成功レスポンス
    return NextResponse.json({
      success: true,
      deliveryId,
      filesCount: files.length,
    })

  } catch (error) {
    console.error('[deliveries/create] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
