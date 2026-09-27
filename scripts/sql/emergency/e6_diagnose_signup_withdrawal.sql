-- 【症状】新規登録してもプロフィールが作られない（「名称未設定」のユーザーが現れない）、または退会できない
-- 【用途】原因の調査（読み取り専用。何も変更しない）。結果に応じて e6a / e6b を使う。どれにも当てはまらなければ、SQLで直さずに調べる
--
-- 事前にエラーの本文を確かめる:
--   - 退会: ブラウザの開発者ツールの Network で /rest/v1/rpc/delete_user の応答（code と message）
--   - 新規登録: ダッシュボードの Logs（Auth と Postgres）で、登録時刻前後の ERROR の本文
--     （Auth では「Database error saving new user」、Postgres ではその原因のエラーが出る）

-- 1. 退会: ログイン済みユーザーが delete_user を実行できるか
--    authenticated が false で、応答が code 42501（permission denied for function delete_user）なら → e6a
SELECT r.rolname,
       has_function_privilege(r.rolname, 'public.delete_user()', 'EXECUTE') AS can_execute
FROM (VALUES ('authenticated'), ('anon')) AS r(rolname);
-- 期待: authenticated = true、anon = false

-- 2. 新規登録: プロフィールを作るトリガーがあり、有効か
--    0行、または enabled が 'D'（無効）なら → e6b
SELECT tgname, tgenabled AS enabled, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';
-- 期待: 1行、enabled = 'O'、definition の末尾が EXECUTE FUNCTION handle_new_user()（public. が付いて表示されることもある）

-- 3. 関数の設定（参考）: SECURITY DEFINER で、search_path が空に固定されていること
--    関数内の名前はすべてスキーマ付き（public.profiles、auth.users）なので、search_path が空でも動く。
--    ここが原因になることは想定していないため、変更するSQLは用意していない
SELECT proname, prosecdef AS security_definer, proconfig
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname IN ('handle_new_user', 'delete_user')
ORDER BY proname;
-- 期待: 2行、security_definer = true、proconfig が search_path を空にする設定（{"search_path=\"\""} のように表示される）

-- 4. 新規登録: 直近24時間に作られたのに、プロフィールがないユーザーの数
--    1件以上で、2 が期待どおりなら、トリガー内の INSERT が失敗している。Postgres のログのエラー本文で原因を調べる
SELECT count(*) AS users_without_profile
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL AND u.created_at >= now() - interval '1 day';
