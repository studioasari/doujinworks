/**
 * ステータスラベル統一定義
 *
 * 全画面のステータス → 日本語ラベル変換はこのファイルに集約する。
 * 画面独自のラベルマップは作成禁止。必ずこのファイルから import すること。
 *
 * 詳細設計: docs/status-redesign.md Section 8
 */

// ============================================================================
// Recruitment Status（募集状態）
// ============================================================================
export const RECRUITMENT_STATUS_LABELS = {
  open: '募集中',
  filled: '募集終了',
  withdrawn: '取下げ',
} as const

export type RecruitmentStatus = keyof typeof RECRUITMENT_STATUS_LABELS

// ============================================================================
// Progress Status（進行状態）
// ============================================================================
export const PROGRESS_STATUS_LABELS = {
  pending: '契約前',
  active: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
} as const

export type ProgressStatus = keyof typeof PROGRESS_STATUS_LABELS

// ============================================================================
// Work Contract Status（個別契約状態）
// ============================================================================
export const CONTRACT_STATUS_LABELS = {
  contracted: '決済待ち',
  paid: '作業中',
  delivered: '納品済み',
  completed: '完了',
  cancelled: 'キャンセル',
} as const

export type ContractStatus = keyof typeof CONTRACT_STATUS_LABELS

// ============================================================================
// Application Status（応募状態）
// ============================================================================
export const APPLICATION_STATUS_LABELS = {
  pending: '応募中',
  accepted: '採用',
  rejected: '不採用',
} as const

export type ApplicationStatus = keyof typeof APPLICATION_STATUS_LABELS

// ============================================================================
// Rejection Reason（不採用理由 → 表示メッセージ）
// ============================================================================
export const REJECTION_REASON_MESSAGES = {
  filled: '別の方が採用されました',
  withdrawn: '依頼者が募集を終了しました',
  cancelled: '依頼がキャンセルされました',
  completed: '依頼が他の方で完了しました',
  manual: '残念ながら今回は選考に漏れました',
} as const

export type RejectionReason = keyof typeof REJECTION_REASON_MESSAGES

// ============================================================================
// バッジ色クラス対応
//
// 画面側の CSS module で status-color class を使う際のマッピング。
// CSS 変数は各画面の module.css に既存定義あり。
// ============================================================================
export const RECRUITMENT_STATUS_COLOR_CLASS = {
  open: 'statusInfo',
  filled: 'statusNeutral',
  withdrawn: 'statusNeutral',
} as const

export const PROGRESS_STATUS_COLOR_CLASS = {
  pending: 'statusNeutral',
  active: 'statusWarning',
  completed: 'statusSuccess',
  cancelled: 'statusError',
} as const

export const CONTRACT_STATUS_COLOR_CLASS = {
  contracted: 'statusWarning',
  paid: 'statusInfo',
  delivered: 'statusSuccess',
  completed: 'statusSuccess',
  cancelled: 'statusError',
} as const

// ============================================================================
// 統合関数: 案件カードの表示用ラベル取得
//
// recruitment_status が 'open' のときは「募集中」を、
// それ以外は progress_status のラベルを返す。
//
// 用途: ダッシュボードや依頼管理で案件単位のバッジを1つだけ表示する画面用。
// ============================================================================
export function getWorkRequestDisplayLabel(request: {
  recruitment_status: string
  progress_status: string
}): string {
  if (request.recruitment_status === 'open') {
    return RECRUITMENT_STATUS_LABELS.open
  }
  const progress = request.progress_status as ProgressStatus
  return PROGRESS_STATUS_LABELS[progress] ?? request.progress_status
}

/**
 * 統合関数: 案件カードのバッジ色クラス取得
 * getWorkRequestDisplayLabel と対になる関数
 */
export function getWorkRequestDisplayColorClass(request: {
  recruitment_status: string
  progress_status: string
}): string {
  if (request.recruitment_status === 'open') {
    return RECRUITMENT_STATUS_COLOR_CLASS.open
  }
  const progress = request.progress_status as ProgressStatus
  return PROGRESS_STATUS_COLOR_CLASS[progress] ?? 'statusNeutral'
}
