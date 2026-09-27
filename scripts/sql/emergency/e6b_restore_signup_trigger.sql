-- 【症状】新規登録してもプロフィールが作られない
-- 【原因】e6_diagnose_signup_withdrawal.sql の 2 で、トリガー on_auth_user_created がない、または無効（enabled = 'D'）
-- 【直すもの】トリガーを元の定義（20260912103020_remote_schema.sql と同じ）で作り直す。作り直したトリガーは有効になる。
--             関数 handle_new_user の中身・実行権限・search_path（空に固定）は変えない
--             （トリガーの実行時には関数の EXECUTE 権限は確認されないため、権限を付与する必要はない）
-- 注意: トリガーが無かった間に作られたユーザーのプロフィールは、このファイルでは作られない。
--       アプリからは作られない（profiles に INSERT のポリシーがなく、Google 登録は補完の処理を通らない）。
--       e6_diagnose_signup_withdrawal.sql の 4 で件数を確かめ、1件以上なら次を実行して作る（handle_new_user と同じ初期値）:
--         INSERT INTO public.profiles (id, display_name)
--         SELECT u.id, '名称未設定' FROM auth.users u
--         LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 確認: 1行、enabled = 'O'
SELECT tgname, tgenabled AS enabled
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';

COMMIT;
