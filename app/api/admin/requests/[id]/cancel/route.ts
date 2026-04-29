import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  syncProgressStatus,
  decrementContractedCount,
  restoreRecruitmentStatusOnCancel,
} from '@/lib/work-request-status'

/**
 * 管理者キャンセル API(work_request 単位の一括契約キャンセル)
 *
 * 呼び出し元: 管理者画面 /admin/requests の case 'cancel' / case 'refund'
 *
 * 認可:
 *   1. ログイン済み
 *   2. profiles.is_admin === true
 *
 * 挙動:
 *   対象 work_request の有効契約(status != 'cancelled')を全て取得し、
 *   各契約について以下を順に実行(Phase 2 標準パターンの拡張版):
 *     1. work_contracts.status='cancelled', cancelled_at=NOW() に UPDATE
 *     2. decrementContractedCount(workRequestId)
 *     3. 残り有効契約数をカウント
 *     4. 残り1件以上なら recruitment_status='open' に書き戻し(filled のときだけ)
 *     5. syncProgressStatus(workRequestId)
 *     6. 依頼者・クリエイターに通知
 *
 *   各契約の処理は try-catch で個別失敗を許容し、results / errors で集約する。
 *
 * Stripe 返金処理は本 API のスコープ外(KOMOJU 移行時に対応予定)。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workRequestId } = await params

    // 認可1: ログイン確認
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

    // 認可2: is_admin 再検証
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'この操作を行う権限がありません' },
        { status: 403 }
      )
    }

    // 対象 work_request 取得
    const { data: workRequest, error: requestError } = await admin
      .from('work_requests')
      .select('id, title, requester_id')
      .eq('id', workRequestId)
      .single()

    if (requestError || !workRequest) {
      return NextResponse.json(
        { error: '依頼が見つかりません' },
        { status: 404 }
      )
    }

    // 有効契約一覧取得(status != 'cancelled')
    const { data: contracts, error: contractsError } = await admin
      .from('work_contracts')
      .select('id, contractor_id, status')
      .eq('work_request_id', workRequestId)
      .neq('status', 'cancelled')

    if (contractsError) {
      console.error('[admin/cancel] 契約一覧取得エラー:', contractsError)
      return NextResponse.json(
        { error: '契約一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    const results = { cancelled: 0, errors: [] as string[] }

    for (const contract of contracts ?? []) {
      try {
        // 1. work_contracts を cancelled に更新(冪等)
        const { data: cancelled, error: cancelErr } = await admin
          .from('work_contracts')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', contract.id)
          .neq('status', 'cancelled')
          .select('id')

        if (cancelErr) {
          console.error(`[admin/cancel] 契約キャンセルエラー (contract: ${contract.id}):`, cancelErr)
          results.errors.push(`契約キャンセル失敗: ${contract.id}`)
          continue
        }
        if (!cancelled || cancelled.length === 0) {
          console.log(`[admin/cancel] スキップ: contract ${contract.id} は既にキャンセル済み`)
          continue
        }

        // 2. contracted_count を減算(失敗してもログのみで続行)
        try {
          await decrementContractedCount(workRequestId)
        } catch (decrementError) {
          console.error(`[admin/cancel] decrementContractedCount エラー (work_request: ${workRequestId}):`, decrementError)
          results.errors.push(`契約数減算失敗: ${contract.id}`)
        }

        // 3. 残り有効契約数をカウント
        const { count: remainingCount, error: countErr } = await admin
          .from('work_contracts')
          .select('id', { count: 'exact', head: true })
          .eq('work_request_id', workRequestId)
          .neq('status', 'cancelled')

        if (countErr) {
          console.error(`[admin/cancel] 残り契約数取得エラー (work_request: ${workRequestId}):`, countErr)
          results.errors.push(`残り契約数取得失敗: ${contract.id}`)
        }

        // 4. 残り1件以上なら recruitment_status='open' に書き戻す(filled のときだけ。冪等)
        if ((remainingCount ?? 0) > 0) {
          const { error: reopenErr } = await admin
            .from('work_requests')
            .update({ recruitment_status: 'open' })
            .eq('id', workRequestId)
            .eq('recruitment_status', 'filled')

          if (reopenErr) {
            console.error(`[admin/cancel] recruitment_status 書き戻しエラー (work_request: ${workRequestId}):`, reopenErr)
            results.errors.push(`recruitment_status 書き戻し失敗: ${contract.id}`)
          }
        }

        // 5. 親 progress_status を同期(共通関数に委譲)
        try {
          await syncProgressStatus(workRequestId)
        } catch (syncError) {
          console.error(`[admin/cancel] syncProgressStatus エラー (work_request: ${workRequestId}):`, syncError)
        }

        // 6. 通知(依頼者・クリエイター)
        const notificationTitle = `「${workRequest.title}」の契約が管理者によりキャンセルされました`
        const notificationMessage = `「${workRequest.title}」の契約が、管理者によりキャンセルされました。詳しくはサポートまでお問い合わせください。`
        const notificationLink = `/requests/${workRequestId}`
        const nowIso = new Date().toISOString()

        const { error: notifyError } = await admin
          .from('notifications')
          .insert([
            {
              profile_id: workRequest.requester_id,
              type: 'cancelled',
              title: notificationTitle,
              message: notificationMessage,
              link: notificationLink,
              read: false,
              created_at: nowIso,
            },
            {
              profile_id: contract.contractor_id,
              type: 'cancelled',
              title: notificationTitle,
              message: notificationMessage,
              link: notificationLink,
              read: false,
              created_at: nowIso,
            },
          ])

        if (notifyError) {
          console.error(`[admin/cancel] 通知作成エラー (contract: ${contract.id}):`, notifyError)
          results.errors.push(`通知作成失敗: ${contract.id}`)
        }

        results.cancelled++
      } catch (error) {
        console.error(`[admin/cancel] 契約処理エラー (contract: ${contract.id}):`, error)
        results.errors.push(`契約処理失敗: ${contract.id}`)
      }
    }

    // 契約ゼロのケース: 親 progress_status を念のため同期
    if ((contracts?.length ?? 0) === 0) {
      try {
        await syncProgressStatus(workRequestId)
      } catch (syncError) {
        console.error(`[admin/cancel] syncProgressStatus エラー (契約ゼロ, work_request: ${workRequestId}):`, syncError)
      }
    }

    // 終端時 recruitment_status を filled に復元(ループ最後に1回だけ)
    try {
      await restoreRecruitmentStatusOnCancel(workRequestId)
    } catch (restoreError) {
      console.error(`[admin/cancel] restoreRecruitmentStatusOnCancel エラー (work_request: ${workRequestId}):`, restoreError)
      results.errors.push(`recruitment_status 復元失敗: ${workRequestId}`)
    }

    return NextResponse.json({
      success: true,
      cancelled: results.cancelled,
      errors: results.errors,
    })
  } catch (error) {
    console.error('[admin/cancel] 予期しないエラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
