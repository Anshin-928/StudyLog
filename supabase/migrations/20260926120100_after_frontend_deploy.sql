-- フロントエンドのデプロイ後に適用する移行の後半
--
-- 適用順の注意: 本番では、新しいフロントエンドをデプロイした「後」に適用すること。
-- 先に適用すると、旧フロントエンドで次の不具合が起きる
--   - 画像アップロード（public/ への書き込み）が拒否される
--   - メールログインが「確認中にエラーが発生しました」で失敗する（check_user_provider を呼んでいるため）

-- 1. 移行期間中に許可していた旧パス public/ へのアップロードを禁止し、`<ユーザーID>/` のみにする
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

-- 2. メールアドレスの登録有無・登録方法を誰でも調べられた RPC を廃止する
--    （AuthPage はこの関数を使わない実装に変更済み）
DROP FUNCTION IF EXISTS public.check_user_provider(text);
