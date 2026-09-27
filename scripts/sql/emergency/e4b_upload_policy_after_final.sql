-- 【症状】後半まで適用した状態で、新しい画面の画像アップロードが「new row violates row-level security policy」で失敗する
--         （保存先は `<ユーザーID>/<ファイル名>`）
-- 【対象】20260926120100_after_frontend_deploy.sql の適用後 **のみ**
--         （前半だけの状態で実行すると旧パス public/ を閉じ、旧画面のアップロードが失敗する。その場合は e4a を使う）
-- 【直すもの】後半のアップロードポリシーを作り直す。ログイン済みユーザーが自分のフォルダにアップロードすることだけを許可する。
--             未ログイン・他人のフォルダ・旧パス public/ へのアップロードは引き続き拒否する
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

DROP POLICY IF EXISTS "Users can upload study-log images to own folder" ON storage.objects;
CREATE POLICY "Users can upload study-log images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-logs' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY IF EXISTS "Users can upload material images to own folder" ON storage.objects;
CREATE POLICY "Users can upload material images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'material-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- 確認: 2行返り、roles が {authenticated} で、with_check が自分のフォルダだけに限っていること（'public' を含まない）
SELECT policyname, roles, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
  AND policyname LIKE 'Users can upload % to own folder';

COMMIT;
