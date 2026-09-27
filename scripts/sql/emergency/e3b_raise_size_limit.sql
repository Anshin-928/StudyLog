-- 【症状】新しい画面で、大きい画像のアップロードが「The object exceeded the maximum allowed size」で失敗する
-- 【効く範囲】画面側の検証（src/lib/imageValidation.ts: 10MiBまで）では許可されているのに、
--             バケットの上限で拒否される場合の修復用。10MiBを超える画像は、このファイルを実行しても
--             画面側で拒否されてアップロードできない（画面側の変更とデプロイが必要で、緊急SQLの範囲外）
-- 【対象】20260926120000_harden_rls.sql の適用後
-- 【直すもの】エラーになったバケットのサイズ上限だけを引き上げる。上限は外さない（NULL にしない）。
--             他のバケットと、形式の制限はそのまま保つ
-- 使い方: 下の <BUCKET> と <BYTES> を、エラーになったバケット名と新しい上限（バイト）に置き換えて実行する。
--         上限は画面側の上限（10MiB = 10485760）以下に限る（例: 10485760）。
--         置き換え忘れ、今より小さい値、10MiBを超える値はエラーで止まる
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

DO $$
DECLARE
  target_bucket text := '<BUCKET>';
  new_limit     text := '<BYTES>';
  current_limit bigint;
BEGIN
  IF target_bucket NOT IN ('avatars', 'study-logs', 'material-images') THEN
    RAISE EXCEPTION 'バケット名が不正です: %', target_bucket;
  END IF;
  -- 画面側の検証（src/lib/imageValidation.ts の MAX_IMAGE_SIZE_BYTES）の上限を超えない
  IF new_limit !~ '^[0-9]+$' OR new_limit::bigint > 10485760 THEN
    RAISE EXCEPTION '上限は 10485760（10MiB）以下のバイト数で指定してください: %', new_limit;
  END IF;

  SELECT file_size_limit INTO current_limit FROM storage.buckets WHERE id = target_bucket;
  IF current_limit IS NOT NULL AND new_limit::bigint < current_limit THEN
    RAISE EXCEPTION '今の上限（%）より小さい値です: %', current_limit, new_limit;
  END IF;

  UPDATE storage.buckets SET file_size_limit = new_limit::bigint WHERE id = target_bucket;
END $$;

-- 確認: 対象バケットの file_size_limit が指定した値で、他のバケットは変わっていないこと
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'study-logs', 'material-images')
ORDER BY id;

COMMIT;
