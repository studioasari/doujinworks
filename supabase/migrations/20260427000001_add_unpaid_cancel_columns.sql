-- ============================================================================
-- 未決済自動キャンセル機能用カラム・インデックス追加
-- Date: 2026-04-27
--
-- 目的:
--   契約成立(status='contracted')から一定期間決済がない契約を
--   自動的にキャンセルする機能(およびリマインド送信機能)のための
--   カラムとインデックスを追加する。
--
-- 追加カラム:
--   - cancelled_at: キャンセル日時の記録
--   - payment_reminder_sent_at: リマインド送信冪等性のフラグ
--
-- 追加インデックス:
--   - idx_work_contracts_unpaid_check: 7日経過自動キャンセル判定用
--   - idx_work_contracts_reminder:     5日経過リマインド送信判定用
--
-- 備考:
--   recruitment_status の CHECK 制約は今回変更しない
--   (既存値 open/filled/withdrawn のまま運用する仕様)
-- ============================================================================

-- ------------------------------------------------------------
-- 1. work_contracts: 新カラム追加
-- ------------------------------------------------------------
ALTER TABLE work_contracts
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 2. work_contracts: 部分インデックス追加
-- ------------------------------------------------------------

-- 7日経過自動キャンセル判定用
-- status='contracted' のレコードのみを対象にして高速にスキャン
CREATE INDEX IF NOT EXISTS idx_work_contracts_unpaid_check
  ON work_contracts(status, contracted_at)
  WHERE status = 'contracted';

-- 5日経過リマインド送信判定用
-- 未送信(payment_reminder_sent_at IS NULL)のものだけを高速に絞り込む
CREATE INDEX IF NOT EXISTS idx_work_contracts_reminder
  ON work_contracts(status, contracted_at, payment_reminder_sent_at)
  WHERE status = 'contracted' AND payment_reminder_sent_at IS NULL;
