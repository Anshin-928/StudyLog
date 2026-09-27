-- 【症状】前半だけを適用した状態で、画像アップロードが「new row violates row-level security policy」で失敗する
-- 【対象】20260926120000_harden_rls.sql の適用後、20260926120100_after_frontend_deploy.sql の適用前 **のみ**
--         （後半の適用後は e4b を使う。このファイルを後半の適用後に実行すると、閉じた旧パス public/ が再び開く）
-- 【直すもの】前半のアップロードポリシーを作り直す。新しい画面が使う `<ユーザーID>/` と、
--             旧画面が使う `public/` の両方を、ログイン済みユーザーに限って許可する（前半のマイグレーションと同じ内容）。
--             未ログインや他人のフォルダへのアップロードは引き続き拒否する
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

DROP POLICY IF EXISTS "Users can upload study-log images to own folder" ON storage.objects;
CREATE POLICY "Users can upload study-log images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-logs' AND (storage.foldername(name))[1] IN ((auth.uid())::text, 'public'));

DROP POLICY IF EXISTS "Users can upload material images to own folder" ON storage.objects;
CREATE POLICY "Users can upload material images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'material-images' AND (storage.foldername(name))[1] IN ((auth.uid())::text, 'public'));

-- 確認: 2行返り、roles が {authenticated} で、with_check に自分のフォルダと 'public' の両方が含まれること
SELECT policyname, roles, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
  AND policyname LIKE 'Users can upload % to own folder';

COMMIT;
