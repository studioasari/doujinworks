import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { contractsApproveLimiter, safeLimit } from '@/utils/rateLimit'
import { syncProgressStatus } from '@/lib/work-request-status'

/**
 * 契約の検収承認API(納品物を承認して契約を完了にする)
 *
 * 呼び出し元: 契約詳細画面の「承認」ボタン
 *
 * 認可:
 *   1. ログイン済み
 *   2. 対象 work_contract の親 work_request の依頼者本人
 *
 * リクエストボディ:
 *   { deliveryId: string }
 *
 * 挙動:
 *   - work_deliveries.status を 'pending' → 'approved' に
 *   - work_contracts.status を 'delivered' → 'completed' に
 *   - completed_at を設定
 *   - 親 progress_status を再計算(全契約完了なら 'completed' に遷移)
 *   - 親が completed に遷移した場合、pending 応募を一括却下
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    // リクエストボディ取得
    const body = await request.json().catch(() => null)
    if (!body || typeof body.deliveryId !== 'string') {
      return NextResponse.json(
        { error: 'deliveryId が不正です' },
        { status: 400 }
      )
    }
    const deliveryId: string = body.deliveryId

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

    // 契約取得
    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select('id, work_request_id, status')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // 親 work_request 取得&本人確認
    const { data: workRequest, error: requestError } = await admin
      .from('work_requests')
      .select('id, requester_id')
      .eq('id', contract.work_request_id)
      .single()

    if (requestError || !workRequest) {
      return NextResponse.json(
        { error: '依頼が見つかりません' },
        { status: 404 }
      )
    }

    if (workRequest.requester_id !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    const { success: withinLimit } = await safeLimit(
      contractsApproveLimiter,
      user.id,
      'contractsApprove'
    )
    if (!withinLimit) {
      return NextResponse.json(
        {
          error:
            'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。',
        },
        { status: 429 }
      )
    }

    // 冪等性: 既に completed なら成功を返す
    if (contract.status === 'completed') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
      })
    }

    if (contract.status !== 'delivered') {
      return NextResponse.json(
        { error: '検収承認できる状態ではありません' },
        { status: 400 }
      )
    }

    // 納品物の確認と承認
    const { data: delivery, error: deliveryFetchError } = await admin
      .from('work_deliveries')
      .select('id, status, work_contract_id')
      .eq('id', deliveryId)
      .single()

    if (deliveryFetchError || !delivery) {
      return NextResponse.json(
        { error: '納品物が見つかりません' },
        { status: 404 }
      )
    }

    if (delivery.work_contract_id !== contractId) {
      return NextResponse.json(
        { error: '納品物と契約の関係が不正です' },
        { status: 400 }
      )
    }

    if (delivery.status !== 'pending') {
      return NextResponse.json(
        { error: 'この納品物は既に処理済みです' },
        { status: 400 }
      )
    }

    // work_deliveries を approved に更新
    const { error: deliveryUpdateError } = await admin
      .from('work_deliveries')
      .update({ status: 'approved' })
      .eq('id', deliveryId)
      .eq('status', 'pending')

    if (deliveryUpdateError) {
      console.error('[contracts/approve] 納品物更新エラー:', deliveryUpdateError)
      return NextResponse.json(
        { error: '納品物の承認に失敗しました' },
        { status: 500 }
      )
    }

    // 契約を completed に更新
    const { error: updateError } = await admin
      .from('work_contracts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .eq('status', 'delivered')

    if (updateError) {
      console.error('[contracts/approve] 契約更新エラー:', updateError)
      return NextResponse.json(
        { error: '検収承認処理に失敗しました' },
        { status: 500 }
      )
    }

    // 親 progress_status 同期
    try {
      await syncProgressStatus(contract.work_request_id)
    } catch (syncError) {
      console.error('[contracts/approve] syncProgressStatus error:', syncError)
      // 同期失敗でもレスポンスは success(契約本体は更新済み)
      // Cron の self-healing で回収する想定
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[contracts/approve] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
