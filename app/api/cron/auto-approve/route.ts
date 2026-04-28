import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { WorkContractRow } from '@/types/supabase-helpers'
import {
  syncProgressStatus,
  decrementContractedCount,
} from '@/lib/work-request-status'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 通知作成ヘルパー
async function createNotification(
  profileId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      profile_id: profileId,
      type,
      title,
      message,
      link,
      read: false,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('通知作成エラー:', error)
  }
}

// 未決済契約処理用の JOIN 付き型
type UnpaidContractRow = WorkContractRow & {
  work_request: { id: string; title: string; requester_id: string }
  contractor: { display_name: string | null } | null
}

// =====================================
// 未決済契約の自動キャンセル(7日経過)
// =====================================
async function processUnpaidContracts(
  results: { unpaidCancelled: number; errors: string[] }
): Promise<void> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: targets, error: fetchError } = await supabase
    .from('work_contracts')
    .select(`
      id,
      work_request_id,
      contractor_id,
      contracted_at,
      status,
      work_request:work_requests!inner (
        id,
        title,
        requester_id
      ),
      contractor:profiles!work_contracts_contractor_id_fkey (
        display_name
      )
    `)
    .eq('status', 'contracted')
    .lte('contracted_at', sevenDaysAgo.toISOString())

  if (fetchError) {
    console.error('未決済契約取得エラー:', fetchError)
    results.errors.push(`未決済契約取得失敗: ${fetchError.message}`)
    return
  }
  if (!targets || targets.length === 0) return

  for (const row of targets) {
    const contract = row as unknown as UnpaidContractRow
    const workRequest = contract.work_request
    const contractorName = contract.contractor?.display_name || '匿名'

    try {
      // a. 契約を cancelled に(status='contracted' のときだけ更新)
      const { data: cancelled, error: cancelErr } = await supabase
        .from('work_contracts')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
        .eq('status', 'contracted')
        .select('id')

      if (cancelErr) {
        console.error(`未決済契約キャンセルエラー (contract: ${contract.id}):`, cancelErr)
        results.errors.push(`未決済契約キャンセル失敗: ${contract.id}`)
        continue
      }
      if (!cancelled || cancelled.length === 0) {
        console.log(`[auto-approve] スキップ: contract ${contract.id} は既にキャンセル済みまたは別ステータス`)
        continue
      }

      // b. contracted_count を減算(失敗してもログに残して続行)
      try {
        await decrementContractedCount(workRequest.id)
      } catch (decrementError) {
        console.error(`[auto-approve] decrementContractedCount エラー (work_request: ${workRequest.id}):`, decrementError)
        results.errors.push(`契約数減算失敗: ${workRequest.id}`)
      }

      // c. 残り有効契約数をカウント
      const { count: remainingCount, error: countErr } = await supabase
        .from('work_contracts')
        .select('id', { count: 'exact', head: true })
        .eq('work_request_id', workRequest.id)
        .neq('status', 'cancelled')

      if (countErr) {
        console.error(`[auto-approve] 残り契約数取得エラー (work_request: ${workRequest.id}):`, countErr)
        results.errors.push(`残り契約数取得失敗: ${workRequest.id}`)
      }

      // d. 残り1件以上なら recruitment_status='open' に書き戻す
      //    (現在 'filled' のときだけ。冪等)
      if ((remainingCount ?? 0) > 0) {
        const { error: reopenErr } = await supabase
          .from('work_requests')
          .update({ recruitment_status: 'open' })
          .eq('id', workRequest.id)
          .eq('recruitment_status', 'filled')

        if (reopenErr) {
          console.error(`[auto-approve] recruitment_status 書き戻しエラー (work_request: ${workRequest.id}):`, reopenErr)
          results.errors.push(`recruitment_status 書き戻し失敗: ${workRequest.id}`)
        }
      }

      // e. progress_status 同期(共通関数に委譲)
      try {
        await syncProgressStatus(workRequest.id)
      } catch (syncError) {
        console.error(`[auto-approve] syncProgressStatus エラー (work_request: ${workRequest.id}):`, syncError)
      }

      // f. 依頼者に通知
      await createNotification(
        workRequest.requester_id,
        'contract_unpaid_cancelled_requester',
        `「${workRequest.title}」の契約を自動的にキャンセルしました`,
        `「${workRequest.title}」につきまして、クリエイター${contractorName}様を採用してから7日間決済が行われなかったため、利用規約第10条第1項(2)に基づき、契約を自動的にキャンセルしました。請求は発生しません。`,
        `/requests/${workRequest.id}`
      )

      // g. クリエイターに通知
      await createNotification(
        contract.contractor_id,
        'contract_unpaid_cancelled_creator',
        `「${workRequest.title}」の契約がキャンセルされました`,
        `ご応募いただいておりました「${workRequest.title}」につきまして、依頼者により決済が行われなかったため、利用規約第10条第1項(2)に基づき、契約はキャンセルされました。ご応募いただきありがとうございました。`,
        `/requests/${workRequest.id}`
      )

      results.unpaidCancelled++
    } catch (error) {
      console.error(`未決済自動キャンセルエラー (contract: ${contract.id}):`, error)
      results.errors.push(`未決済自動キャンセル失敗: ${contract.id}`)
    }
  }
}

// =====================================
// 未決済リマインド送信(5日経過)
// =====================================
async function sendUnpaidReminders(
  results: { unpaidReminded: number; errors: string[] }
): Promise<void> {
  const fiveDaysAgo = new Date()
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

  const { data: targets, error: fetchError } = await supabase
    .from('work_contracts')
    .select(`
      id,
      work_request_id,
      contractor_id,
      contracted_at,
      status,
      work_request:work_requests!inner (
        id,
        title,
        requester_id
      ),
      contractor:profiles!work_contracts_contractor_id_fkey (
        display_name
      )
    `)
    .eq('status', 'contracted')
    .lte('contracted_at', fiveDaysAgo.toISOString())
    .is('payment_reminder_sent_at', null)

  if (fetchError) {
    console.error('未決済リマインド対象取得エラー:', fetchError)
    results.errors.push(`未決済リマインド取得失敗: ${fetchError.message}`)
    return
  }
  if (!targets || targets.length === 0) return

  for (const row of targets) {
    const contract = row as unknown as UnpaidContractRow
    const workRequest = contract.work_request
    const contractorName = contract.contractor?.display_name || '匿名'

    try {
      // a. 冪等性確保: 先に payment_reminder_sent_at を立てる
      const { data: marked, error: markErr } = await supabase
        .from('work_contracts')
        .update({ payment_reminder_sent_at: new Date().toISOString() })
        .eq('id', contract.id)
        .is('payment_reminder_sent_at', null)
        .select('id')

      if (markErr) {
        console.error(`リマインドフラグ更新エラー (contract: ${contract.id}):`, markErr)
        results.errors.push(`リマインドフラグ更新失敗: ${contract.id}`)
        continue
      }
      if (!marked || marked.length === 0) {
        console.log(`[auto-approve] スキップ: contract ${contract.id} は既にリマインド送信済み`)
        continue
      }

      // b. 依頼者に通知
      await createNotification(
        workRequest.requester_id,
        'contract_unpaid_reminder',
        `【重要】「${workRequest.title}」の決済期限が近づいています`,
        `「${workRequest.title}」につきまして、クリエイター${contractorName}様を採用してから5日が経過しました。決済期限まで残り2日です。期限までに決済を完了されない場合、利用規約第10条第1項(2)に基づき、契約は自動的にキャンセルされます。`,
        `/requests/${workRequest.id}`
      )

      results.unpaidReminded++
    } catch (error) {
      console.error(`未決済リマインド送信エラー (contract: ${contract.id}):`, error)
      results.errors.push(`未決済リマインド送信失敗: ${contract.id}`)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（Cron Secretで保護）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      deliveryWarnings: 0,
      deliveryAutoApprovals: 0,
      cancellationAutoApprovals: 0,
      unpaidCancelled: 0,
      unpaidReminded: 0,
      errors: [] as string[]
    }

    // =====================================
    // 1. 納品の自動承認警告（検収期限3日前）
    // =====================================
    
    const fourDaysAgo = new Date()
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // 4日前に納品されて、まだ警告を送っていないものを取得
    const { data: warningTargets, error: warningError } = await supabase
      .from('work_deliveries')
      .select(`
        id,
        work_contract_id,
        work_contracts!inner (
          id,
          work_request_id,
          contractor_id,
          status,
          auto_approval_warning_sent_at,
          work_request:work_requests!inner (
            id,
            title,
            requester_id
          )
        )
      `)
      .eq('status', 'pending')
      .gte('created_at', fourDaysAgo.toISOString())
      .lt('created_at', threeDaysAgo.toISOString())
      .is('work_contracts.auto_approval_warning_sent_at', null)
      .eq('work_contracts.status', 'delivered')

    if (warningError) {
      console.error('警告対象取得エラー:', warningError)
      results.errors.push(`警告取得失敗: ${warningError.message}`)
    } else if (warningTargets && warningTargets.length > 0) {
      for (const delivery of warningTargets) {
        const contract = delivery.work_contracts as unknown as WorkContractRow & { work_request: { id: string; title: string; requester_id: string } }
        const workRequest = contract.work_request

        try {
          // 警告通知を送信
          await createNotification(
            workRequest.requester_id,
            'auto_approval_warning',
            '【重要】検収期限が近づいています',
            `「${workRequest.title}」の検収期限まであと3日です。期限を過ぎると自動承認されます。`,
            `/requests/${workRequest.id}/contracts/${contract.id}`
          )

          // フラグを立てる（既に設定済みならスキップ）
          const { data: warningUpdated, error: warningUpdateError } = await supabase
            .from('work_contracts')
            .update({ auto_approval_warning_sent_at: new Date().toISOString() })
            .eq('id', contract.id)
            .is('auto_approval_warning_sent_at', null)
            .select('id')

          if (warningUpdateError) {
            console.error(`警告フラグ更新エラー (contract: ${contract.id}):`, warningUpdateError)
            results.errors.push(`警告フラグ更新失敗: ${contract.id}`)
            continue
          }
          if (!warningUpdated || warningUpdated.length === 0) {
            console.log(`[auto-approve] スキップ: contract ${contract.id} は既に警告送信済み`)
            continue
          }

          results.deliveryWarnings++
        } catch (error) {
          console.error(`警告送信エラー (contract: ${contract.id}):`, error)
          results.errors.push(`警告送信失敗: ${contract.id}`)
        }
      }
    }

    // =====================================
    // 2. 納品の自動承認（検収期限7日経過）
    // =====================================
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 7日以上前に納品されて、まだpendingのものを取得
    const { data: approvalTargets, error: approvalError } = await supabase
      .from('work_deliveries')
      .select(`
        id,
        work_contract_id,
        work_contracts!inner (
          id,
          work_request_id,
          contractor_id,
          final_price,
          status,
          work_request:work_requests!inner (
            id,
            title,
            requester_id
          )
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString())
      .eq('work_contracts.status', 'delivered')

    if (approvalError) {
      console.error('自動承認対象取得エラー:', approvalError)
      results.errors.push(`自動承認取得失敗: ${approvalError.message}`)
    } else if (approvalTargets && approvalTargets.length > 0) {
      for (const delivery of approvalTargets) {
        const contract = delivery.work_contracts as unknown as WorkContractRow & { work_request: { id: string; title: string; requester_id: string } }
        const workRequest = contract.work_request

        try {
          // 納品を承認（pending のときだけ更新）
          const { data: deliveryUpdated, error: deliveryUpdateError } = await supabase
            .from('work_deliveries')
            .update({
              status: 'approved',
              feedback: '検収期限経過により自動承認されました'
            })
            .eq('id', delivery.id)
            .eq('status', 'pending')
            .select('id')

          if (deliveryUpdateError) {
            console.error(`納品承認エラー (delivery: ${delivery.id}):`, deliveryUpdateError)
            results.errors.push(`納品承認失敗: ${delivery.id}`)
            continue
          }
          if (!deliveryUpdated || deliveryUpdated.length === 0) {
            console.log(`[auto-approve] スキップ: delivery ${delivery.id} は既に処理済み`)
            continue
          }

          // 契約を完了（delivered のときだけ更新）
          const completedAt = new Date().toISOString()
          const { data: contractUpdated, error: contractUpdateError } = await supabase
            .from('work_contracts')
            .update({
              status: 'completed',
              completed_at: completedAt
            })
            .eq('id', contract.id)
            .eq('status', 'delivered')
            .select('id')

          if (contractUpdateError) {
            console.error(`契約完了エラー (contract: ${contract.id}):`, contractUpdateError)
            results.errors.push(`契約完了失敗: ${contract.id}`)
            continue
          }
          if (!contractUpdated || contractUpdated.length === 0) {
            console.log(`[auto-approve] スキップ: contract ${contract.id} は既に完了済みまたは別ステータス`)
            continue
          }

          // 親 progress_status 同期（共通関数に委譲）
          try {
            await syncProgressStatus(workRequest.id)
          } catch (syncError) {
            console.error(`[auto-approve] syncProgressStatus エラー (work_request: ${workRequest.id}):`, syncError)
          }

          // クリエイターに通知
          await createNotification(
            contract.contractor_id,
            'completed',
            '自動承認されました',
            `「${workRequest.title}」が検収期限経過により承認されました。お疲れ様でした！`,
            `/requests/${workRequest.id}/contracts/${contract.id}`
          )

          // 依頼者にも通知
          await createNotification(
            workRequest.requester_id,
            'completed',
            '自動承認が完了しました',
            `「${workRequest.title}」が検収期限経過により自動承認されました。`,
            `/requests/${workRequest.id}/contracts/${contract.id}`
          )

          results.deliveryAutoApprovals++
        } catch (error) {
          console.error(`自動承認エラー (delivery: ${delivery.id}):`, error)
          results.errors.push(`自動承認失敗: ${delivery.id}`)
        }
      }
    }

    // =====================================
    // 3. キャンセル申請の自動承認（7日経過）
    // =====================================

    // 7日以上前に作成されて、まだpendingのキャンセル申請を取得
    const { data: cancelTargets, error: cancelError } = await supabase
      .from('cancellation_requests')
      .select(`
        id,
        work_contract_id,
        requester_id,
        reason,
        work_contracts!inner (
          id,
          work_request_id,
          contractor_id,
          status,
          payment_intent_id,
          work_request:work_requests!inner (
            id,
            title,
            requester_id
          )
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString())

    if (cancelError) {
      console.error('キャンセル申請取得エラー:', cancelError)
      results.errors.push(`キャンセル申請取得失敗: ${cancelError.message}`)
    } else if (cancelTargets && cancelTargets.length > 0) {
      for (const cancelRequest of cancelTargets) {
        const contract = cancelRequest.work_contracts as unknown as WorkContractRow & { work_request: { id: string; title: string; requester_id: string } }
        const workRequest = contract.work_request

        try {
          // キャンセル申請を承認（pending のときだけ更新）
          const { data: cancelUpdated, error: cancelUpdateError } = await supabase
            .from('cancellation_requests')
            .update({
              status: 'approved',
              resolved_at: new Date().toISOString()
            })
            .eq('id', cancelRequest.id)
            .eq('status', 'pending')
            .select('id')

          if (cancelUpdateError) {
            console.error(`キャンセル承認エラー (request: ${cancelRequest.id}):`, cancelUpdateError)
            results.errors.push(`キャンセル承認失敗: ${cancelRequest.id}`)
            continue
          }
          if (!cancelUpdated || cancelUpdated.length === 0) {
            console.log(`[auto-approve] スキップ: cancellation ${cancelRequest.id} は既に処理済み`)
            continue
          }

          // 契約をキャンセル（cancelled 以外のときだけ更新）
          const { data: contractCancelled, error: contractCancelError } = await supabase
            .from('work_contracts')
            .update({
              status: 'cancelled'
            })
            .eq('id', contract.id)
            .neq('status', 'cancelled')
            .select('id')

          if (contractCancelError) {
            console.error(`契約キャンセルエラー (contract: ${contract.id}):`, contractCancelError)
            results.errors.push(`契約キャンセル失敗: ${contract.id}`)
            continue
          }
          if (!contractCancelled || contractCancelled.length === 0) {
            console.log(`[auto-approve] スキップ: contract ${contract.id} は既にキャンセル済み`)
            continue
          }

          // contracted_count を減算(失敗してもログに残して続行)
          try {
            await decrementContractedCount(workRequest.id)
          } catch (decrementError) {
            console.error(`[auto-approve] decrementContractedCount エラー (work_request: ${workRequest.id}):`, decrementError)
            results.errors.push(`契約数減算失敗: ${workRequest.id}`)
          }

          // 残り有効契約数をカウント
          const { count: remainingCount, error: countErr } = await supabase
            .from('work_contracts')
            .select('id', { count: 'exact', head: true })
            .eq('work_request_id', workRequest.id)
            .neq('status', 'cancelled')

          if (countErr) {
            console.error(`[auto-approve] 残り契約数取得エラー (work_request: ${workRequest.id}):`, countErr)
            results.errors.push(`残り契約数取得失敗: ${workRequest.id}`)
          }

          // 残り1件以上なら recruitment_status='open' に書き戻す(filled のときだけ。冪等)
          if ((remainingCount ?? 0) > 0) {
            const { error: reopenErr } = await supabase
              .from('work_requests')
              .update({ recruitment_status: 'open' })
              .eq('id', workRequest.id)
              .eq('recruitment_status', 'filled')

            if (reopenErr) {
              console.error(`[auto-approve] recruitment_status 書き戻しエラー (work_request: ${workRequest.id}):`, reopenErr)
              results.errors.push(`recruitment_status 書き戻し失敗: ${workRequest.id}`)
            }
          }

          // 親 progress_status 同期（共通関数に委譲）
          try {
            await syncProgressStatus(workRequest.id)
          } catch (syncError) {
            console.error(`[auto-approve] syncProgressStatus エラー (work_request: ${workRequest.id}):`, syncError)
          }

          // 返金処理（payment_intent_idがある場合）
          if (contract.payment_intent_id) {
            try {
              const refundResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/refund`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`,
                },
                body: JSON.stringify({
                  workContractId: contract.id,
                  reason: 'キャンセル申請の自動承認による返金'
                })
              })

              if (!refundResponse.ok) {
                console.error(`返金処理失敗 (contract: ${contract.id})`)
                results.errors.push(`返金処理失敗: ${contract.id}`)
              }
            } catch (refundError) {
              console.error(`返金APIエラー (contract: ${contract.id}):`, refundError)
              results.errors.push(`返金APIエラー: ${contract.id}`)
            }
          }

          // 申請者に通知
          await createNotification(
            cancelRequest.requester_id,
            'cancelled',
            'キャンセルが自動承認されました',
            `「${workRequest.title}」のキャンセル申請が7日経過により自動承認されました。`,
            `/requests/${workRequest.id}/contracts/${contract.id}`
          )

          // 相手方に通知
          const otherPartyId = cancelRequest.requester_id === workRequest.requester_id
            ? contract.contractor_id
            : workRequest.requester_id

          await createNotification(
            otherPartyId,
            'cancelled',
            'キャンセルが自動承認されました',
            `「${workRequest.title}」のキャンセル申請が7日経過により自動承認されました。`,
            `/requests/${workRequest.id}/contracts/${contract.id}`
          )

          results.cancellationAutoApprovals++
        } catch (error) {
          console.error(`キャンセル自動承認エラー (request: ${cancelRequest.id}):`, error)
          results.errors.push(`キャンセル自動承認失敗: ${cancelRequest.id}`)
        }
      }
    }

    // =====================================
    // 4. 未決済契約の自動キャンセル(7日経過)
    // =====================================
    await processUnpaidContracts(results)

    // =====================================
    // 5. 未決済リマインド送信(5日経過)
    // =====================================
    await sendUnpaidReminders(results)

    // =====================================
    // 6. 結果を返す
    // =====================================

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        deliveryWarningsSent: results.deliveryWarnings,
        deliveryAutoApprovalsProcessed: results.deliveryAutoApprovals,
        cancellationAutoApprovalsProcessed: results.cancellationAutoApprovals,
        unpaidContractsCancelled: results.unpaidCancelled,
        unpaidRemindersSent: results.unpaidReminded,
        errors: results.errors
      }
    })

  } catch (error) {
    console.error('自動承認処理エラー:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '不明なエラー' 
      },
      { status: 500 }
    )
  }
}