import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { applicationsAcceptLimiter, safeLimit } from '@/utils/rateLimit'
import { acceptApplication } from '@/lib/work-request-status'

/**
 * 応募を採用するAPI
 *
 * 呼び出し元: 案件管理画面の「採用」ボタン
 *
 * 認可:
 *   1. ログイン済みであること
 *   2. 対象 work_request の依頼者本人であること
 *
 * リクエストボディ:
 *   {
 *     finalPrice: number,   // 最終契約価格
 *     deadline: string | null  // 納期(YYYY-MM-DD or null)
 *   }
 *
 * レスポンス:
 *   成功: { success: true, workContractId: string, filled: boolean }
 *   失敗: { error: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params

    // 1. ログイン確認
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

    // 2. リクエストボディ取得
    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body.finalPrice !== 'number' ||
      body.finalPrice <= 0
    ) {
      return NextResponse.json(
        { error: '価格が不正です' },
        { status: 400 }
      )
    }
    const finalPrice: number = body.finalPrice
    const deadline: string | null =
      typeof body.deadline === 'string' ? body.deadline : null

    const admin = createAdminClient()

    // 3. プロフィール取得(auth uid → profiles.id)
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

    // 4. 応募から親 work_request を特定
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

    // 5. 親 work_request 取得&本人確認
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

    // 6. レート制限
    const { success: withinLimit } = await safeLimit(
      applicationsAcceptLimiter,
      user.id,
      'applicationsAccept'
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

    // 7. 採用処理(共通関数に委譲)
    try {
      const result = await acceptApplication({
        applicationId,
        workRequestId: application.work_request_id,
        finalPrice,
        deadline,
      })

      return NextResponse.json({
        success: true,
        workContractId: result.workContractId,
        filled: result.filled,
      })
    } catch (acceptError) {
      const message =
        acceptError instanceof Error
          ? acceptError.message
          : '採用処理に失敗しました'
      console.error('[applications/accept] acceptApplication error:', acceptError)
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (error) {
    console.error('[applications/accept] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
