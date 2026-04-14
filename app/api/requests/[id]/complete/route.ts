import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requestsCompleteLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 依頼全体の完了チェック＆ステータス更新API
 *
 * 検収承認時に呼び出され、対象の work_request に紐づく
 * 全 work_contracts が completed かどうかを判定する。
 * 全て completed なら work_requests.status を 'completed' に更新する。
 *
 * 認可:
 *  1. ログイン済みであること
 *  2. 対象 work_request の依頼者（requester_id）本人であること
 *
 * 冪等性:
 *  - 既に completed なら何もせず成功を返す
 *  - 未完了の契約がある場合も成功を返す（更新はしない）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workRequestId } = await params

    // 1. ログイン確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

    const admin = createAdminClient()

    // 2. プロフィール取得（auth uid → profiles.id）
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

    // 3. 依頼を取得
    const { data: workRequest, error: requestError } = await admin
      .from('work_requests')
      .select('id, status, requester_id')
      .eq('id', workRequestId)
      .single()

    if (requestError || !workRequest) {
      return NextResponse.json(
        { error: '依頼が見つかりません' },
        { status: 404 }
      )
    }

    // 4. 本人確認: 依頼者本人か
    if (workRequest.requester_id !== myProfile.id) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // 4-post. レート制限
    const { success: withinLimit } = await safeLimit(
      requestsCompleteLimiter,
      user.id,
      'requestsComplete'
    )
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'リクエスト頻度が上限に達しました。しばらく待ってから再試行してください。' },
        { status: 429 }
      )
    }

    // 5. 冪等性チェック: 既に completed なら何もしない
    if (workRequest.status === 'completed') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
      })
    }

    // ステータスが 'paid' でなければ完了にできない
    if (workRequest.status !== 'paid') {
      return NextResponse.json(
        { error: 'この依頼はまだ完了できる状態ではありません' },
        { status: 400 }
      )
    }

    // 6. 全契約チェック（並行契約対応）
    const { data: contracts, error: contractsError } = await admin
      .from('work_contracts')
      .select('id, status')
      .eq('work_request_id', workRequestId)

    if (contractsError) {
      console.error('[requests/complete] 契約取得エラー:', contractsError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json(
        { error: 'この依頼に紐づく契約が見つかりません' },
        { status: 400 }
      )
    }

    const allCompleted = contracts.every(c => c.status === 'completed')

    if (!allCompleted) {
      return NextResponse.json({
        success: true,
        allCompleted: false,
        message: '一部のクリエイターの作業がまだ完了していないため、依頼全体はまだ完了になりません',
      })
    }

    // 7. work_requests を completed に更新
    const { error: updateError } = await admin
      .from('work_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', workRequestId)

    if (updateError) {
      console.error('[requests/complete] 更新エラー:', updateError)
      return NextResponse.json(
        { error: 'サーバーエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      allCompleted: true,
    })
  } catch (error) {
    console.error('[requests/complete] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
