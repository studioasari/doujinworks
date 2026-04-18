import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requestsWithdrawLimiter, safeLimit } from '@/utils/rateLimit'
import { withdrawWorkRequest } from '@/lib/work-request-status'

/**
 * 案件の募集終了(取り下げ)API
 *
 * 呼び出し元: 案件管理画面の「募集終了」ボタン
 *
 * 認可:
 *   1. ログイン済み
 *   2. 対象 work_request の依頼者本人
 *
 * 挙動:
 *   - recruitment_status を 'withdrawn' に更新
 *   - pending な応募を全て rejected(reason='withdrawn')
 *   - 契約ゼロなら progress_status も 'cancelled' に
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workRequestId } = await params

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

    const { data: workRequest, error: requestError } = await admin
      .from('work_requests')
      .select('id, requester_id, recruitment_status')
      .eq('id', workRequestId)
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
      requestsWithdrawLimiter,
      user.id,
      'requestsWithdraw'
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

    try {
      const result = await withdrawWorkRequest(workRequestId)
      return NextResponse.json({
        success: true,
        hadContracts: result.hadContracts,
      })
    } catch (withdrawError) {
      const message =
        withdrawError instanceof Error
          ? withdrawError.message
          : '募集終了処理に失敗しました'
      console.error('[requests/withdraw] withdrawWorkRequest error:', withdrawError)
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (error) {
    console.error('[requests/withdraw] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
