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

  // 親案件の情報を取得(定員判定 + 通知/チャット用)
  const { data: request, error: fetchError } = await admin
    .from('work_requests')
    .select(
      'id, recruitment_status, progress_status, number_of_positions, contracted_count, requester_id, title'
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

  // ============================================================================
  // チャットルーム確保(採用者と依頼者の間の連絡チャンネル)
  // ベストエフォート: 失敗してもログに記録するだけで採用は成功扱い
  // ============================================================================
  try {
    const requesterId = request.requester_id
    const contractorId = application.applicant_id

    // 既存のチャットルームを検索(2人の共通ルーム)
    const { data: myRooms } = await admin
      .from('chat_room_participants')
      .select('chat_room_id')
      .eq('profile_id', requesterId)

    let targetRoomId: string | null = null
    if (myRooms && myRooms.length > 0) {
      for (const room of myRooms) {
        if (!room.chat_room_id) continue
        const { data: participants } = await admin
          .from('chat_room_participants')
          .select('profile_id')
          .eq('chat_room_id', room.chat_room_id)
        const profileIds = (participants ?? [])
          .map((p) => p.profile_id)
          .filter((id): id is string => !!id)
        if (
          profileIds.length === 2 &&
          profileIds.includes(contractorId)
        ) {
          targetRoomId = room.chat_room_id
          break
        }
      }
    }

    // 無ければ新規作成
    if (!targetRoomId) {
      const nowIso = new Date().toISOString()
      const { data: newRoom, error: roomInsertError } = await admin
        .from('chat_rooms')
        .insert({
          related_request_id: workRequestId,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single()

      if (roomInsertError || !newRoom) {
        console.error(
          `${LOG_PREFIX} acceptApplication: chat_rooms INSERT failed`,
          roomInsertError
        )
      } else {
        targetRoomId = newRoom.id
        const { error: participantsError } = await admin
          .from('chat_room_participants')
          .insert([
            {
              chat_room_id: targetRoomId,
              profile_id: requesterId,
              last_read_at: nowIso,
              pinned: false,
              hidden: false,
            },
            {
              chat_room_id: targetRoomId,
              profile_id: contractorId,
              last_read_at: nowIso,
              pinned: false,
              hidden: false,
            },
          ])
        if (participantsError) {
          console.error(
            `${LOG_PREFIX} acceptApplication: chat_room_participants INSERT failed`,
            participantsError
          )
        }
      }
    }

    // 採用通知(被採用者へ)
    const { error: notifyError } = await admin
      .from('notifications')
      .insert({
        profile_id: contractorId,
        type: 'accepted',
        title: '応募が採用されました',
        message: `「${request.title}」の応募が採用されました。決済をお待ちください。`,
        link: `/requests/${workRequestId}/contracts/${newContract.id}`,
        read: false,
        created_at: new Date().toISOString(),
      })
    if (notifyError) {
      console.error(
        `${LOG_PREFIX} acceptApplication: notification INSERT failed`,
        notifyError
      )
    }
  } catch (sideEffectError) {
    // ベストエフォート: 副作用の失敗は採用全体を失敗にしない
    console.error(
      `${LOG_PREFIX} acceptApplication: side effect (chat/notification) error`,
      sideEffectError
    )
  }

  return {
    workContractId: newContract.id,
    filled: reachedCapacity,
  }
}

// ============================================================================
// decrementContractedCount: 契約数の減算
// ============================================================================

/**
 * work_requests.contracted_count を 1 減算する。
 *
 * 用途: 並行契約のキャンセル時(未決済自動キャンセル等)に契約数を減らす。
 *       acceptApplication でインクリメントする処理と対になる。
 *
 * 【注意: 競合リスク】
 * acceptApplication と同様、SELECT + UPDATE のベストエフォート方式。
 * 同時キャンセル操作で競合する可能性は理論上あるが、運用上は無視できる想定。
 *
 * 認可チェック(本人確認等)は呼び出し側の責務。
 */
export async function decrementContractedCount(
  workRequestId: string
): Promise<number> {
  const admin = createAdminClient()

  const { data: request, error: fetchError } = await admin
    .from('work_requests')
    .select('id, contracted_count')
    .eq('id', workRequestId)
    .single()

  if (fetchError || !request) {
    console.error(
      `${LOG_PREFIX} decrementContractedCount: work_request not found (id=${workRequestId}):`,
      fetchError
    )
    throw new Error(`依頼が見つかりません: ${workRequestId}`)
  }

  const currentCount = request.contracted_count ?? 0
  if (currentCount <= 0) {
    console.error(
      `${LOG_PREFIX} decrementContractedCount: invalid contracted_count (id=${workRequestId}, current=${currentCount})`
    )
    throw new Error(
      `契約数の減算ができません(現在値: ${currentCount})`
    )
  }

  const newCount = currentCount - 1

  const { error: updateError } = await admin
    .from('work_requests')
    .update({ contracted_count: newCount })
    .eq('id', workRequestId)

  if (updateError) {
    console.error(
      `${LOG_PREFIX} decrementContractedCount UPDATE failed (id=${workRequestId}):`,
      updateError
    )
    throw new Error(`契約数の更新に失敗しました: ${updateError.message}`)
  }

  return newCount
}

// ============================================================================
// restoreRecruitmentStatusOnCancel: 終端時の recruitment_status 復元
// ============================================================================

/**
 * 全契約が cancelled になった場合、recruitment_status を 'filled' に復元する。
 *
 * 仕様: 全キャンセル時の recruitment_status は filled のまま維持。
 *       ただし並行契約のキャンセル動線で途中で 'open' に書き戻された後、
 *       最終的に全契約 cancelled になるケースで、これを復元する責務を持つ。
 *
 * 挙動:
 *   - 残り有効契約数(status != 'cancelled')を SELECT COUNT で取得
 *   - 0 件なら recruitment_status='filled' に書き戻す
 *     (現在 'open' のときだけ。eq('recruitment_status', 'open') で原子的・冪等)
 *   - 1 件以上なら何もしない(再募集中の状態を維持)
 *
 * 呼び出し位置: 各キャンセル動線の syncProgressStatus 呼び出し直後。
 *
 * 認可チェック(本人確認等)は呼び出し側の責務。
 */
export async function restoreRecruitmentStatusOnCancel(
  workRequestId: string
): Promise<void> {
  const admin = createAdminClient()

  const { count: remainingCount, error: countError } = await admin
    .from('work_contracts')
    .select('id', { count: 'exact', head: true })
    .eq('work_request_id', workRequestId)
    .neq('status', 'cancelled')

  if (countError) {
    console.error(
      `${LOG_PREFIX} restoreRecruitmentStatusOnCancel COUNT failed (id=${workRequestId}):`,
      countError
    )
    throw new Error(
      `残り契約数の取得に失敗しました: ${countError.message}`
    )
  }

  // 残り 1 件以上なら何もしない(再募集中の状態を維持)
  if ((remainingCount ?? 0) > 0) {
    return
  }

  // 全契約 cancelled: recruitment_status='open' を 'filled' に復元(冪等)
  const { error: updateError } = await admin
    .from('work_requests')
    .update({ recruitment_status: 'filled' })
    .eq('id', workRequestId)
    .eq('recruitment_status', 'open')

  if (updateError) {
    console.error(
      `${LOG_PREFIX} restoreRecruitmentStatusOnCancel UPDATE failed (id=${workRequestId}):`,
      updateError
    )
    throw new Error(
      `recruitment_status 復元に失敗しました: ${updateError.message}`
    )
  }
}
