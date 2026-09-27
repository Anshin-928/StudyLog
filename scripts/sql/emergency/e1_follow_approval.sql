-- 【症状】非公開アカウントが、フォロー申請を承認できない
--         （承認ボタンを押しても pending のまま / permission denied for table follows）
-- 【対象】20260926120000_harden_rls.sql の適用後
-- 【直すもの】承認に必要な「フォローされた側による status の更新」の権限とポリシーだけを作り直す。
--             申請した側が自分で accepted にできない制限（脆弱性の修正）はそのまま保つ
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

GRANT UPDATE (status) ON public.follows TO authenticated;

DROP POLICY IF EXISTS "Users can approve received follow requests" ON public.follows;
CREATE POLICY "Users can approve received follow requests" ON public.follows
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = following_id)
  WITH CHECK (auth.uid() = following_id AND status = 'accepted');

-- 確認: 1行返り、with_check に status = 'accepted' が含まれること
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'follows' AND cmd = 'UPDATE';

COMMIT;
