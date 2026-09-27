-- 【症状】退会できず、delete_user の応答が code 42501（permission denied for function delete_user）
-- 【原因】e6_diagnose_signup_withdrawal.sql の 1 で、authenticated の can_execute が false
--         （前半のマイグレーションが PUBLIC からの実行権限を取り消したため、authenticated への個別の付与がないと実行できない）
-- 【直すもの】ログイン済みユーザーに delete_user の実行権限だけを付与する。
--             未ログイン（anon）と PUBLIC には付与しない。関数の中身と search_path（空に固定）は変えない
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- 確認: authenticated = true、anon = false
SELECT r.rolname,
       has_function_privilege(r.rolname, 'public.delete_user()', 'EXECUTE') AS can_execute
FROM (VALUES ('authenticated'), ('anon')) AS r(rolname);

COMMIT;
