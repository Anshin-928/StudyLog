-- 【症状】後半の適用後、旧画面の利用者の画像アップロード失敗が多く、再読み込みの案内では追いつかない
-- 【対象】20260926120100_after_frontend_deploy.sql の適用後
-- 【直すもの】ログイン済みユーザーに限り、旧画面が使う旧パス public/ へのアップロードを一時的に許可する
--             （前半だけを適用した状態と同じ）。未ログインのアップロードは引き続き拒否する。
--             メールログインの失敗（check_user_provider の廃止）はこのファイルでは戻さない。
--             あの関数は誰でもメールアドレスの登録有無を調べられる脆弱性なので、再読み込みの案内で対応する
-- 旧画面が落ち着いたら 20260926120100_after_frontend_deploy.sql と同じ内容（public/ を閉じる）を改めて適用すること
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

-- 確認: 2行返り、roles が {authenticated} で、with_check に 'public' が含まれること
SELECT policyname, roles, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'INSERT'
  AND policyname LIKE 'Users can upload % to own folder';

COMMIT;
