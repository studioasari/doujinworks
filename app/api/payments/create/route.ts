import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { paymentsCreateLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 検収承認時に payments レコードを作成するAPI
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. 対象 work_contract の依頼者（work_request.requester_id）本人であること
 *  3. work_contract.status が 'completed' であること
 *  4. 同じ work_request_id の payments レコードがまだ存在しないこと（冪等性）
 *
 * 金額は contract.final_price からサーバー側で計算するため、
 * クライアントから金額を指定することはできない（改ざん防止）。
 */
export async function POST(request: NextRequest) {
  try {
    // 1. ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // 2. リクエストボディ検証
    let body: { contractId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
    }

    const contractId = body.contractId
    if (typeof contractId !== 'string' || contractId.length === 0) {
      return NextResponse.json({ error: 'contractId が不正です' }, { status: 400 })
    }

    // 3. 契約を取得（admin clientでRLSをバイパス）
    const admin = createAdminClient()
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select(`
        id,
        work_request_id,
        contractor_id,
        final_price,
        status,
        completed_at,
        work_request:work_requests!work_request_id (
          requester_id
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 })
    }

    // 4-pre. 自分の profiles.id を取得
    //    work_requests.requester_id は profiles.id を指すため、
    //    user.id (auth uid) から profiles.id を引いて比較する必要がある。
    //    profiles テーブルは id (内部ID) と user_id (auth uid) が別カラムになっている。
    const { data: myProfile, error: myProfileError } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (myProfileError || !myProfile) {
      return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 })
    }

    // 4. 本人確認: 依頼者本人か
    const workRequest = contract.work_request as { requester_id: string } | { requester_id: string }[] | null
    const requesterId = Array.isArray(workRequest)
      ? workRequest[0]?.requester_id
      : workRequest?.requester_id

    if (!requesterId || requesterId !== myProfile.id) {
      return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
    }

    // 4-post. レート制限
    const { success: withinLimit } = await safeLimit(
      paymentsCreateLimiter,
      user.id,
      'paymentsCreate'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // 5. ステータス確認
    if (contract.status !== 'completed') {
      return NextResponse.json(
        { error: '検収承認後でないと実行できません' },
        { status: 400 }
      )
    }

    // 6. 二重INSERT防止
    //    同じ依頼に対して複数クリエイターと並行契約することがあるため、
    //    work_request_id 単体ではなく (work_request_id, creator_id) の
    //    組み合わせで重複判定する。
    //    同じ依頼×同じクリエイターの組み合わせは DB側の一意制約で弾かれるので
    //    このチェックは冪等レスポンスを返すための追加の安全網。
    const { data: existing, error: existingError } = await admin
      .from('payments')
      .select('id')
      .eq('work_request_id', contract.work_request_id)
      .eq('creator_id', contract.contractor_id)
      .maybeSingle()

    if (existingError) {
      console.error('[payments/create] 既存レコード検索エラー:', existingError)
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }

    if (existing) {
      // 冪等性: 既に作成済みなら成功扱い
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        payment: { id: existing.id },
      })
    }

    // 7. 金額計算（サーバー側で計算 = 改ざん不可）
    if (typeof contract.final_price !== 'number' || contract.final_price <= 0) {
      return NextResponse.json({ error: '契約金額が不正です' }, { status: 400 })
    }
    const platformFee = Math.floor(contract.final_price * 0.12)
    const creatorAmount = contract.final_price - platformFee

    // completed_month は「契約が完了（検収承認）した月」を表す。
    // API 呼び出し時の現在月ではなく、contract.completed_at から算出する。
    // ステップ5で status === 'completed' を確認済みなので completed_at は必ず存在するはず。
    // null の場合は異常状態として 400 で弾く。
    if (!contract.completed_at) {
      return NextResponse.json(
        { error: '契約の完了日時が記録されていません' },
        { status: 400 }
      )
    }
    const completedMonth = (contract.completed_at as string).slice(0, 7)

    // 8. payments INSERT
    // created_at, updated_at, transfer_fee は DB のデフォルト値に任せて省略
    const { data: payment, error: insertError } = await admin
      .from('payments')
      .insert({
        work_request_id: contract.work_request_id,
        creator_id: contract.contractor_id,
        amount: creatorAmount,
        status: 'pending',
        completed_month: completedMonth,
      })
      .select('id, amount')
      .single()

    if (insertError || !payment) {
      console.error('[payments/create] INSERT エラー:', insertError)
      return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
    }

    // 9. 成功
    return NextResponse.json({ success: true, payment })
  } catch (error) {
    console.error('[payments/create] 予期しないエラー:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
