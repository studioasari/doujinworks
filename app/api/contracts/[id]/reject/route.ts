import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { contractsRejectLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 納品物の差戻しAPI(delivered → paid に戻す)
 *
 * 呼び出し元: 契約詳細画面の「差戻し」ボタン
 *
 * 認可:
 *   1. ログイン済み
 *   2. 対象 work_contract の親 work_request の依頼者本人
 *
 * 挙動:
 *   - work_contracts.status を 'delivered' → 'paid' に
 *   - delivered_at はクリアしない(納品履歴として残す)
 *   - 親ステータスは変化しない(active のまま)
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
      .select('id, work_request_id, status')
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

    if (workRequest.requester_id !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    const { success: withinLimit } = await safeLimit(
      contractsRejectLimiter,
      user.id,
      'contractsReject'
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

    if (contract.status !== 'delivered') {
      return NextResponse.json(
        { error: '差戻しできる状態ではありません' },
        { status: 400 }
      )
    }

    const { error: updateError } = await admin
      .from('work_contracts')
      .update({ status: 'paid' })
      .eq('id', contractId)
      .eq('status', 'delivered')

    if (updateError) {
      console.error('[contracts/reject] 契約更新エラー:', updateError)
      return NextResponse.json(
        { error: '差戻し処理に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[contracts/reject] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
