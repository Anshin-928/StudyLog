-- 非公開アカウントへの accepted なフォローの一覧（調査用・読み取り専用）
--
-- 20260926120000_harden_rls.sql の適用前は、申請者が承認なしに accepted を作成・更新できた。
-- ポリシー修正は今後の不正を防ぐだけで、過去に作られた行は残るため、本番適用時にこのSQLで調査する。
--
-- 注意: 正当な行と不正な行はDB上で区別できない（承認日時や承認者の記録がない）。正当な行には次のものがある
--   - 相手が非公開アカウントにする前にフォローした（公開中のフォローは accepted で作られる）
--   - 相手が申請を承認した
-- そのため一括削除や pending への一括変更はせず、結果を確認したうえで個別に判断すること。
-- 例えば「アカウント作成直後から非公開なのに、フォロー作成日時がアカウント作成日時より後」の行は、
-- 承認された行かすり抜けた行のどちらかであり、承認の事実は本人（following）にしか確認できない。
SELECT
  f.follower_id,
  follower.display_name  AS follower_name,
  f.following_id,
  following.display_name AS following_name,
  f.created_at           AS followed_at,
  following.created_at   AS following_account_created_at
FROM public.follows f
JOIN public.profiles following ON following.id = f.following_id
JOIN public.profiles follower  ON follower.id  = f.follower_id
WHERE f.status = 'accepted'
  AND following.is_public = false
ORDER BY f.following_id, f.created_at;
