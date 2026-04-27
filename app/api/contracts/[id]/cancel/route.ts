import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { contractsCancelLimiter, safeLimit } from '@/utils/rateLimit'
import { syncProgressStatus } from '@/lib/work-request-status'

/**
 * 契約キャンセル承認API(cancellation_requests を承認して契約を cancelled に)
 *
 * 呼び出し元: 契約詳細画面のキャンセル承認操作
 *
 * 認可:
 *   1. ログイン済み
 *   2. cancellation_requests の相手方(=キャンセル申請した人ではない側)
 *
 * 挙動:
 *   - work_contracts.status を 'cancelled' に
 *   - cancellation_requests を approved 状態に(既存カラムに合わせる)
 *   - 親 progress_status を再計算(全契約 cancelled なら 'cancelled' に)
 *
 * 【注意】
 * このAPIは既存の cancellation_requests テーブルの仕様を前提にしている。
 * 既存コード(契約詳細画面のキャンセル承認処理)の流儀に合わせて呼ぶ。
 * 既存コードを読み、cancellation_requests の approve 時にどのカラムを
 * 更新しているかを確認してから実装すること。
 *
 * リクエストボディ:
 *   { cancellationRequestId: string }
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body.cancellationRequestId !== 'string') {
      return NextResponse.json(
        { error: 'パラメータが不正です' },
        { status: 400 }
      )
    }
    const cancellationRequestId: string = body.cancellationRequestId

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

    const { data: contract, error: contractError } = await admin
      .from('work_contracts')
      .select('id, work_request_id, contractor_id, status')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: '契約が見つかりません' },
        { status: 404 }
      )
    }

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

    // キャンセル申請を取得して相手方(申請者の逆側)本人確認
    const { data: cancellationRequest, error: crError } = await admin
      .from('cancellation_requests')
      .select('*')
      .eq('id', cancellationRequestId)
      .single()

    if (crError || !cancellationRequest) {
      return NextResponse.json(
        { error: 'キャンセル申請が見つかりません' },
        { status: 404 }
      )
    }

    // 申請者以外(承認する側)が操作していることを確認
    const isRequester = workRequest.requester_id === myProfile.id
    const isContractor = contract.contractor_id === myProfile.id
    if (!isRequester && !isContractor) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }
    if (cancellationRequest.requester_id === myProfile.id) {
      return NextResponse.json(
        { error: '申請者はキャンセルを承認できません' },
        { status: 403 }
      )
    }

    const { success: withinLimit } = await safeLimit(
      contractsCancelLimiter,
      user.id,
      'contractsCancel'
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

    if (contract.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
      })
    }

    if (contract.status === 'completed') {
      return NextResponse.json(
        { error: '完了済みの契約はキャンセルできません' },
        { status: 400 }
      )
    }

    // 契約を cancelled に更新
    const { error: updateError } = await admin
      .from('work_contracts')
      .update({ status: 'cancelled' })
      .eq('id', contractId)

    if (updateError) {
      console.error('[contracts/cancel] 契約更新エラー:', updateError)
      return NextResponse.json(
        { error: 'キャンセル処理に失敗しました' },
        { status: 500 }
      )
    }

    // 親 progress_status 同期
    try {
      await syncProgressStatus(contract.work_request_id)
    } catch (syncError) {
      console.error('[contracts/cancel] syncProgressStatus error:', syncError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[contracts/cancel] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
