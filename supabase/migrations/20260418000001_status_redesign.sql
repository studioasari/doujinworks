-- ============================================================================
-- Status Redesign Migration (Phase 3)
-- Date: 2026-04-18
--
-- 背景: work_requests.status に「募集状態」と「進行状態」が混在していた
--       問題を解決するため、2軸に分離する。
--
-- 詳細設計: docs/status-redesign.md を参照
-- ============================================================================

-- ------------------------------------------------------------
-- 1. work_requests: 新カラム追加、旧カラム削除、CHECK制約
-- ------------------------------------------------------------
ALTER TABLE work_requests
  ADD COLUMN IF NOT EXISTS recruitment_status TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS progress_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE work_requests
  DROP COLUMN IF EXISTS status;

ALTER TABLE work_requests
  DROP CONSTRAINT IF EXISTS work_requests_recruitment_status_check;
ALTER TABLE work_requests
  ADD CONSTRAINT work_requests_recruitment_status_check
    CHECK (recruitment_status IN ('open', 'filled', 'withdrawn'));

ALTER TABLE work_requests
  DROP CONSTRAINT IF EXISTS work_requests_progress_status_check;
ALTER TABLE work_requests
  ADD CONSTRAINT work_requests_progress_status_check
    CHECK (progress_status IN ('pending', 'active', 'completed', 'cancelled'));

-- ------------------------------------------------------------
-- 2. work_contracts: CHECK制約追加
-- ------------------------------------------------------------
ALTER TABLE work_contracts
  DROP CONSTRAINT IF EXISTS work_contracts_status_check;
ALTER TABLE work_contracts
  ADD CONSTRAINT work_contracts_status_check
    CHECK (status IN ('contracted', 'paid', 'delivered', 'completed', 'cancelled'));

-- ------------------------------------------------------------
-- 3. work_request_applications: カラム追加、CHECK制約
-- ------------------------------------------------------------
ALTER TABLE work_request_applications
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE work_request_applications
  DROP CONSTRAINT IF EXISTS work_request_applications_status_check;
ALTER TABLE work_request_applications
  ADD CONSTRAINT work_request_applications_status_check
    CHECK (status IS NULL OR status IN ('pending', 'accepted', 'rejected'));

ALTER TABLE work_request_applications
  DROP CONSTRAINT IF EXISTS work_request_applications_rejection_reason_check;
ALTER TABLE work_request_applications
  ADD CONSTRAINT work_request_applications_rejection_reason_check
    CHECK (rejection_reason IS NULL OR rejection_reason IN
      ('filled', 'withdrawn', 'cancelled', 'completed', 'manual'));
