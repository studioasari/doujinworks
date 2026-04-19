-- ============================================================================
-- payments テーブルに work_contract_id カラムを追加
-- ============================================================================
-- 目的:
--   並行契約で同一クリエイターが同一案件に複数契約を持つケースで、
--   どの契約に対する支払いかを特定できるようにする
--
-- back-fill:
--   既存レコードは (work_request_id, creator_id) で work_contracts を逆引き
-- ============================================================================

ALTER TABLE payments
ADD COLUMN work_contract_id uuid
  REFERENCES work_contracts(id) ON DELETE SET NULL;

CREATE INDEX idx_payments_work_contract_id ON payments(work_contract_id);

UPDATE payments p
SET work_contract_id = c.id
FROM work_contracts c
WHERE p.work_request_id = c.work_request_id
  AND p.creator_id = c.contractor_id
  AND p.work_contract_id IS NULL;
