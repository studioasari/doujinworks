-- ============================================================================
-- ビジネスアカウント必須化: RLS ポリシー強化
-- ============================================================================
-- 目的:
--   個人アカウント(can_request_work=false, can_receive_work=false)の
--   ユーザーが案件作成・応募できないように RLS で DB レベルで制限する。
--
-- 方針:
--   RESTRICTIVE ポリシーとして追加。既存の PERMISSIVE ポリシーと AND で
--   結合されるので、既存の動作を壊さない。
--
-- 関連UI:
--   - app/requests/create/client.tsx: 個人アカウントには作成フォームを
--     非表示にし、ビジネス切り替えCTAを表示
--   - app/requests/[id]/client.tsx: 個人アカウントには応募ボタンを
--     ビジネス切り替えCTAに差し替え
-- ============================================================================

-- DEFAULT 値設定(新規ユーザーの can_* カラムが NULL になるのを防ぐ)
ALTER TABLE profiles ALTER COLUMN can_request_work SET DEFAULT false;
ALTER TABLE profiles ALTER COLUMN can_receive_work SET DEFAULT false;

-- 案件作成の RLS 制限
CREATE POLICY "require_business_for_request_create" ON work_requests
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, public
  WITH CHECK (
    (SELECT can_request_work FROM profiles WHERE id = requester_id) IS TRUE
  );

-- 応募作成の RLS 制限
CREATE POLICY "require_business_for_application_create" ON work_request_applications
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, public
  WITH CHECK (
    (SELECT can_receive_work FROM profiles WHERE id = applicant_id) IS TRUE
  );
