-- 【症状】タイムラインやプロフィールで、教材名・カテゴリが表示されない（自分の教材は表示される）
-- 【対象】20260926120000_harden_rls.sql の適用後
-- 【直すもの】教材・カテゴリの閲覧判定に使う関数の実行権限と、閲覧ポリシーだけを作り直す。
--             非公開アカウントの教材を、本人と承認済みフォロワー以外から隠す制限はそのまま保つ
--             （"Materials are viewable by everyone" のような全員に公開するポリシーには戻さない）
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

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

GRANT EXECUTE ON FUNCTION public.can_view_user_content(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Materials are viewable by permitted users" ON public.materials;
CREATE POLICY "Materials are viewable by permitted users" ON public.materials
  FOR SELECT
  TO PUBLIC
  USING (public.can_view_user_content(user_id));

DROP POLICY IF EXISTS "Categories are viewable by permitted users" ON public.categories;
CREATE POLICY "Categories are viewable by permitted users" ON public.categories
  FOR SELECT
  TO PUBLIC
  USING (public.can_view_user_content(user_id));

-- 確認: 2行返り、どちらも qual が can_view_user_content(user_id) であること
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('materials', 'categories') AND cmd = 'SELECT';

COMMIT;
