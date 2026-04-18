import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { applicationsRejectLimiter, safeLimit } from '@/utils/rateLimit'

/**
 * 応募を個別に却下するAPI
 *
 * 呼び出し元: 案件管理画面の「不採用」ボタン
 *
 * 認可:
 *   1. ログイン済み
 *   2. 親 work_request の依頼者本人
 *
 * 挙動:
 *   - 対象 application を status='rejected', rejection_reason='manual' に
 *   - rejected_at を現在時刻に
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params

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

    // 応募取得
    const { data: application, error: appError } = await admin
      .from('work_request_applications')
      .select('id, work_request_id, status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return NextResponse.json(
        { error: '応募が見つかりません' },
        { status: 404 }
      )
    }

    // 親 work_request 取得&本人確認
    const { data: workRequest, error: requestError } = await admin
      .from('work_requests')
      .select('id, requester_id')
      .eq('id', application.work_request_id)
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
      applicationsRejectLimiter,
      user.id,
      'applicationsReject'
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

    // 既に pending でなければ冪等に成功を返す
    if (application.status !== 'pending') {
      return NextResponse.json({
        success: true,
        alreadyDecided: true,
      })
    }

    // 却下処理(直接 UPDATE。共通関数は filled/withdrawn/cancelled/completed 用のため)
    const { error: updateError } = await admin
      .from('work_request_applications')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejection_reason: 'manual',
      })
      .eq('id', applicationId)
      .eq('status', 'pending')

    if (updateError) {
      console.error('[applications/reject] 更新エラー:', updateError)
      return NextResponse.json(
        { error: '却下処理に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[applications/reject] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
