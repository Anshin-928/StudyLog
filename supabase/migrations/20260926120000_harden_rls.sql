-- RLS・権限の強化
-- 1. follows: 非公開アカウントの承認制をDBで強制する
-- 2. storage: 未ログイン・他人のフォルダへのアップロードを禁止する（旧パス public/ は移行期間中のみ許可）
-- 3. SECURITY DEFINER 関数の search_path 固定と実行権限の絞り込み
-- 4. materials / categories: 非公開アカウントの教材・カテゴリを、本人と承認済みフォロワー以外から隠す
--
-- 本番への適用順:
--   1. このマイグレーションを適用する（旧フロントエンドのままでも動作する）
--   2. フロントエンドをデプロイする
--   3. 20260926120100_after_frontend_deploy.sql を適用する

-- ============================================================
-- 1. follows
-- ============================================================
-- 旧ポリシーは INSERT で status を検証しておらず、FOR ALL のため申請者自身が UPDATE で
-- pending → accepted に書き換えられた（非公開ユーザーの記録が承認なしで閲覧できた）
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can update received follow requests" ON public.follows;
DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;
DROP POLICY IF EXISTS "follows_select" ON public.follows;
-- 残すもの: "Follows are viewable by everyone"(SELECT), "Users can delete received follows"(DELETE: 双方から解除可)

-- 既存データに自己フォローが残っていても適用が失敗しないよう NOT VALID とする（新規・更新行には効く）
ALTER TABLE public.follows
  ADD CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id) NOT VALID;

-- 公開アカウントへは accepted、非公開アカウントへは pending（申請）でのみ作成できる
CREATE POLICY "Users can follow as themselves" ON public.follows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND (
      status = 'pending'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = follows.following_id AND profiles.is_public = true
      )
    )
  );

-- 更新できるのはフォローされた側の「申請の承認」だけ
CREATE POLICY "Users can approve received follow requests" ON public.follows
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = following_id)
  WITH CHECK (auth.uid() = following_id AND status = 'accepted');

-- フォロー元・先を付け替えられないよう、UPDATE できる列を status に限定する
REVOKE UPDATE ON public.follows FROM anon, authenticated;
GRANT UPDATE (status) ON public.follows TO authenticated;

-- ============================================================
-- 2. storage
-- ============================================================
-- ローカル環境にもバケットを用意する（本番の既存バケットは公開設定を変えない）。
-- サイズ・形式の上限はクライアントの検証（src/lib/imageValidation.ts）と揃え、APIを直接叩かれても制限が効くようにする
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',         'avatars',         true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('study-logs',      'study-logs',      true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('material-images', 'material-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 旧ポリシーはバケット名しか見ておらず、未ログインでも任意のパスに書き込めた
DROP POLICY IF EXISTS "Public insert study-logs" ON storage.objects;
DROP POLICY IF EXISTS "画像アップロード許可" ON storage.objects;

-- 新規アップロードは `<ユーザーID>/<ファイル名>` にのみ許可する。
-- ただしフロントエンドの切り替え中も画像アップロードが失敗しないよう、旧フロントエンドが使う `public/` も
-- ログイン済みユーザーに限り一時的に許可する（匿名アップロードはこの時点で閉じる）。
-- `public/` の許可は 20260926120100_after_frontend_deploy.sql で取り除く
CREATE POLICY "Users can upload study-log images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-logs' AND (storage.foldername(name))[1] IN ((auth.uid())::text, 'public'));

CREATE POLICY "Users can upload material images to own folder" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'material-images' AND (storage.foldername(name))[1] IN ((auth.uid())::text, 'public'));

-- 記録・教材の削除時に画像を消せるようにする（旧パス public/ の画像も、アップロードした本人なら削除できる）
CREATE POLICY "Users can delete own study-log images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-logs' AND owner_id = (auth.uid())::text);

CREATE POLICY "Users can delete own material images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'material-images' AND owner_id = (auth.uid())::text);

-- ============================================================
-- 3. SECURITY DEFINER 関数
-- ============================================================
-- search_path を固定し、悪意あるスキーマのオブジェクトに解決される余地をなくす（関数内は全てスキーマ修飾済み）
ALTER FUNCTION public.check_user_provider(text) SET search_path = '';
ALTER FUNCTION public.delete_user() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- 退会はログインユーザーだけ、トリガー関数は誰からも直接呼べないようにする
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4. materials / categories
-- ============================================================
-- 指定ユーザーのコンテンツを閲覧できるか（本人・公開アカウント・承認済みフォロワー）
CREATE OR REPLACE FUNCTION public.can_view_user_content(owner_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path = ''
  AS $function$
  SELECT auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = owner_id AND is_public = true)
    OR EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = auth.uid() AND following_id = owner_id AND status = 'accepted'
    );
$function$;

DROP POLICY IF EXISTS "Materials are viewable by everyone" ON public.materials;
CREATE POLICY "Materials are viewable by permitted users" ON public.materials
  FOR SELECT
  TO PUBLIC
  USING (public.can_view_user_content(user_id));

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by permitted users" ON public.categories
  FOR SELECT
  TO PUBLIC
  USING (public.can_view_user_content(user_id));
