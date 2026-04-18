/**
 * work_requests / work_contracts / work_request_applications の
 * ステータス遷移を司る共通関数ライブラリ
 *
 * 【呼び出しルール】
 * - 必ず API ルート(サーバーサイド)から呼ぶこと
 * - クライアント側からは絶対に import しない
 *   (import 'server-only' で強制されている)
 * - 認可チェック(本人確認等)は呼び出し側の責務。
 *   このライブラリは認可を行わない
 * - エラーは throw する。呼び出し側で try/catch すること
 *
 * 【設計思想】
 * - 状態遷移ロジックをここに集約
 * - 画面・API ルートはこれらの関数を呼ぶだけ
 * - ログは console.error に [work-request-status] プレフィックス付きで出力
 *
 * 詳細設計: docs/status-redesign.md Section 7.2
 */

import 'server-only'
import { createAdminClient } from '@/utils/supabase/admin'

// ============================================================================
// 定数
// ============================================================================

const LOG_PREFIX = '[work-request-status]'

// 契約の未終端状態(まだ進行中)
const CONTRACT_ACTIVE_STATUSES = ['contracted', 'paid', 'delivered'] as const

// ============================================================================
// 型定義
// ============================================================================

export type RejectionReason =
  | 'filled'
  | 'withdrawn'
  | 'cancelled'
  | 'completed'
  | 'manual'

type ContractStatus =
  | 'contracted'
  | 'paid'
  | 'delivered'
  | 'completed'
  | 'cancelled'

type ProgressStatus = 'pending' | 'active' | 'completed' | 'cancelled'

// ============================================================================
// 純粋関数: 子契約リストから親の progress_status を算出
// ============================================================================

/**
 * 子契約の status 配列から、親 work_request の progress_status を算出する
 *
 * ルール:
 *   契約がゼロ → 'pending'
 *   未終端(contracted/paid/delivered)の契約が1つでもある → 'active'
 *   全契約が終端(completed/cancelled):
 *     completed が1件以上 → 'completed'
 *     全て cancelled → 'cancelled'
 */
export function recomputeProgressStatus(
  contractStatuses: string[]
): ProgressStatus {
  if (contractStatuses.length === 0) {
    return 'pending'
  }

  const hasActive = contractStatuses.some((s) =>
    CONTRACT_ACTIVE_STATUSES.includes(s as (typeof CONTRACT_ACTIVE_STATUSES)[number])
  )

  if (hasActive) {
    return 'active'
  }

  // 全契約が終端状態
  const hasCompleted = contractStatuses.some((s) => s === 'completed')
  if (hasCompleted) {
    return 'completed'
  }

  // completed 無し、全て cancelled
  return 'cancelled'
}

// ============================================================================
// 内部ユーティリティ: 親に紐づく契約一覧取得
// ============================================================================

async function getContractStatuses(workRequestId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('work_contracts')
    .select('status')
    .eq('work_request_id', workRequestId)

  if (error) {
    console.error(`${LOG_PREFIX} getContractStatuses failed:`, error)
    throw new Error(`契約一覧の取得に失敗しました: ${error.message}`)
  }

  return (data ?? []).map((c) => c.status as string)
}

// ============================================================================
// rejectPendingApplications: pending な応募を一括 rejected に
// ============================================================================

/**
 * 指定 work_request の pending な応募を全て rejected にする。
 * rejected_at を現在時刻、rejection_reason を引数の reason に設定する。
 *
 * 既に rejected/accepted の応募は触らない(WHERE status = 'pending' で絞込)。
 *
 * 使用契機:
 *   filled    - 募集枠が埋まった際の一括却下
 *   withdrawn - クライアントが案件を取り下げた際
 *   cancelled - 案件全体がキャンセルになった際
 *   completed - 案件全体が完了した際
 *   (manual は個別操作なのでこの関数は使わない)
 */
export async function rejectPendingApplications(params: {
  workRequestId: string
  reason: Exclude<RejectionReason, 'manual'>
}): Promise<{ rejectedCount: number }> {
  const { workRequestId, reason } = params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('work_request_applications')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('work_request_id', workRequestId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error(
      `${LOG_PREFIX} rejectPendingApplications failed (workRequestId=${workRequestId}, reason=${reason}):`,
      error
    )
    throw new Error(`応募の一括却下に失敗しました: ${error.message}`)
  }

  return { rejectedCount: data?.length ?? 0 }
}

// ============================================================================
// syncProgressStatus: 子契約変化後に親 progress_status を再計算
// ============================================================================

/**
 * 子契約の状態が変化した直後に呼び出す。
 * 親 work_request の progress_status を再計算し、必要なら UPDATE する。
 *
 * 親が completed/cancelled に遷移した場合、
 * 残っている pending な応募も自動で一括却下する(仕様書 Section 6.3)。
 */
export async function syncProgressStatus(workRequestId: string): Promise<{
  changed: boolean
  newStatus: ProgressStatus
}> {
  const admin = createAdminClient()

  // 現状の親ステータスを取得
  const { data: current, error: fetchError } = await admin
    .from('work_requests')
    .select('progress_status')
    .eq('id', workRequestId)
    .single()

  if (fetchError || !current) {
    console.error(
      `${LOG_PREFIX} syncProgressStatus: work_request not found (id=${workRequestId}):`,
      fetchError
    )
    throw new Error(`依頼が見つかりません: ${workRequestId}`)
  }

  // 子契約の状態を取得して新ステータスを算出
  const statuses = await getContractStatuses(workRequestId)
  const newStatus = recomputeProgressStatus(statuses)

  // 変化なしなら何もしない(冪等)
  if (current.progress_status === newStatus) {
    return { changed: false, newStatus }
  }

  // 終端状態への遷移で completed_at を設定
  const updatePayload: {
    progress_status: ProgressStatus
    completed_at?: string
  } = {
    progress_status: newStatus,
  }
  if (newStatus === 'completed' || newStatus === 'cancelled') {
    updatePayload.completed_at = new Date().toISOString()
  }

  const { error: updateError } = await admin
    .from('work_requests')
    .update(updatePayload)
    .eq('id', workRequestId)

  if (updateError) {
    console.error(
      `${LOG_PREFIX} syncProgressStatus UPDATE failed (id=${workRequestId}, newStatus=${newStatus}):`,
      updateError
    )
    throw new Error(`ステータス更新に失敗しました: ${updateError.message}`)
  }

  // 終端に遷移した場合、pending な応募を一括却下
  if (newStatus === 'completed') {
    await rejectPendingApplications({ workRequestId, reason: 'completed' })
  } else if (newStatus === 'cancelled') {
    await rejectPendingApplications({ workRequestId, reason: 'cancelled' })
  }

  return { changed: true, newStatus }
}

// ============================================================================
// withdrawWorkRequest: 案件取り下げ(募集終了)
// ============================================================================

/**
 * クライアント(または管理者)が案件を取り下げる処理。
 *
 * 実行内容:
 *   1. recruitment_status を 'withdrawn' に更新
 *   2. pending な応募を全て rejected(reason='withdrawn')
 *   3. 契約ゼロなら progress_status も 'cancelled' に遷移
 *      (契約ありの場合は各契約の個別キャンセル処理に委ねる)
 *
 * 認可チェック(本人確認等)は呼び出し側の責務。
 */
export async function withdrawWorkRequest(workRequestId: string): Promise<{
  hadContracts: boolean
}> {
  const admin = createAdminClient()

  // 現在のステータスを取得
  const { data: request, error: fetchError } = await admin
    .from('work_requests')
    .select('id, recruitment_status, progress_status')
    .eq('id', workRequestId)
    .single()

  if (fetchError || !request) {
    console.error(
      `${LOG_PREFIX} withdrawWorkRequest: work_request not found (id=${workRequestId}):`,
      fetchError
    )
    throw new Error(`依頼が見つかりません: ${workRequestId}`)
  }

  // 既に withdrawn/filled なら冪等に処理
  if (request.recruitment_status !== 'open') {
    console.error(
      `${LOG_PREFIX} withdrawWorkRequest: already not open (id=${workRequestId}, current=${request.recruitment_status})`
    )
    throw new Error('この依頼は既に募集中ではありません')
  }

  // 1. recruitment_status を withdrawn に
  const { error: updateError } = await admin
    .from('work_requests')
    .update({ recruitment_status: 'withdrawn' })
    .eq('id', workRequestId)

  if (updateError) {
    console.error(
      `${LOG_PREFIX} withdrawWorkRequest UPDATE recruitment_status failed (id=${workRequestId}):`,
      updateError
    )
    throw new Error(`募集終了処理に失敗しました: ${updateError.message}`)
  }

  // 2. pending な応募を一括却下
  await rejectPendingApplications({ workRequestId, reason: 'withdrawn' })

  // 3. 契約の有無を確認して progress_status を判定
  const statuses = await getContractStatuses(workRequestId)
  const hadContracts = statuses.length > 0

  if (!hadContracts && request.progress_status === 'pending') {
    const { error: progressError } = await admin
      .from('work_requests')
      .update({
        progress_status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', workRequestId)

    if (progressError) {
      console.error(
        `${LOG_PREFIX} withdrawWorkRequest UPDATE progress_status failed (id=${workRequestId}):`,
        progressError
      )
      throw new Error(
        `進行ステータス更新に失敗しました: ${progressError.message}`
      )
    }
  }

  return { hadContracts }
}

// ============================================================================
// acceptApplication: 採用処理
// ============================================================================

/**
 * 応募を採用する処理。以下を順に実行:
 *   1. application.status を 'accepted' に
 *   2. 新しい work_contract を作成 (status='contracted')
 *   3. work_requests.contracted_count をインクリメント
 *   4. progress_status が 'pending' なら 'active' に遷移
 *   5. 採用人数が number_of_positions に達したら:
 *      - recruitment_status を 'filled' に
 *      - 残り pending な応募を一括 rejected(reason='filled')
 *
 * 【注意: 競合リスク】
 * contracted_count のインクリメントは SELECT + UPDATE のベストエフォート方式。
 * 同時採用操作で競合する可能性は理論上あるが、運用上は無視できる想定。
 * 将来的に Postgres RPC 関数で原子化することを推奨。
 *
 * 認可チェック(案件の所有者か等)は呼び出し側の責務。
 */
export async function acceptApplication(params: {
  applicationId: string
  workRequestId: string
  finalPrice: number
  deadline: string | null
}): Promise<{
  workContractId: string
  filled: boolean
}> {
  const { applicationId, workRequestId, finalPrice, deadline } = params
  const admin = createAdminClient()

  // 親案件の情報を取得(定員判定用)
  const { data: request, error: fetchError } = await admin
    .from('work_requests')
    .select(
      'id, recruitment_status, progress_status, number_of_positions, contracted_count'
    )
    .eq('id', workRequestId)
    .single()

  if (fetchError || !request) {
    console.error(
      `${LOG_PREFIX} acceptApplication: work_request not found (id=${workRequestId}):`,
      fetchError
    )
    throw new Error(`依頼が見つかりません: ${workRequestId}`)
  }

  if (request.recruitment_status !== 'open') {
    throw new Error('この依頼は募集中ではありません')
  }

  // 応募の情報を取得して採用対象者を特定
  const { data: application, error: appError } = await admin
    .from('work_request_applications')
    .select('id, applicant_id, status, work_request_id')
    .eq('id', applicationId)
    .single()

  if (appError || !application) {
    console.error(
      `${LOG_PREFIX} acceptApplication: application not found (id=${applicationId}):`,
      appError
    )
    throw new Error(`応募が見つかりません: ${applicationId}`)
  }

  if (application.work_request_id !== workRequestId) {
    throw new Error('応募と依頼の関係が不正です')
  }

  if (application.status !== 'pending') {
    throw new Error('この応募は既に採用または却下されています')
  }

  // 1. application を accepted に
  const { error: updateAppError } = await admin
    .from('work_request_applications')
    .update({ status: 'accepted' })
    .eq('id', applicationId)
    .eq('status', 'pending') // 冪等性(競合検出)

  if (updateAppError) {
    console.error(
      `${LOG_PREFIX} acceptApplication UPDATE application failed (id=${applicationId}):`,
      updateAppError
    )
    throw new Error(`応募の更新に失敗しました: ${updateAppError.message}`)
  }

  // 2. work_contract を作成
  const { data: newContract, error: contractError } = await admin
    .from('work_contracts')
    .insert({
      work_request_id: workRequestId,
      contractor_id: application.applicant_id,
      application_id: applicationId,
      final_price: finalPrice,
      deadline: deadline,
      status: 'contracted',
      contracted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (contractError || !newContract) {
    console.error(
      `${LOG_PREFIX} acceptApplication INSERT contract failed:`,
      contractError
    )
    throw new Error(`契約の作成に失敗しました: ${contractError?.message}`)
  }

  // 3. contracted_count をインクリメント(ベストエフォート)
  const newCount = (request.contracted_count ?? 0) + 1
  const maxPositions = request.number_of_positions ?? 1
  const reachedCapacity = newCount >= maxPositions

  const updatePayload: {
    contracted_count: number
    progress_status?: ProgressStatus
    recruitment_status?: 'filled'
  } = {
    contracted_count: newCount,
  }

  // 4. progress_status が pending なら active に
  if (request.progress_status === 'pending') {
    updatePayload.progress_status = 'active'
  }

  // 5. 定員到達なら recruitment_status を filled に
  if (reachedCapacity) {
    updatePayload.recruitment_status = 'filled'
  }

  const { error: requestUpdateError } = await admin
    .from('work_requests')
    .update(updatePayload)
    .eq('id', workRequestId)

  if (requestUpdateError) {
    console.error(
      `${LOG_PREFIX} acceptApplication UPDATE work_request failed (id=${workRequestId}):`,
      requestUpdateError
    )
    throw new Error(
      `依頼の更新に失敗しました: ${requestUpdateError.message}`
    )
  }

  // 6. 定員到達時は残り pending を一括却下
  if (reachedCapacity) {
    await rejectPendingApplications({ workRequestId, reason: 'filled' })
  }

  return {
    workContractId: newContract.id,
    filled: reachedCapacity,
  }
}
