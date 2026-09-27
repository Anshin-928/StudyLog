-- 【症状】新しい画面で、特定の形式の画像だけアップロードが「mime type ... is not supported」で失敗する
-- 【効く範囲】画面側の検証（src/lib/imageValidation.ts: JPG・PNG・WebP・GIF）では許可されているのに、
--             バケットの設定で拒否される場合の修復用。画面側で許可していない形式（HEIC など）は、
--             このファイルを実行してもアップロードできない（画面側の変更とデプロイが必要で、緊急SQLの範囲外）。
--             また、バケットの形式の制限が確認するのは、アップロード時に申告される形式（Content-Type）だけで、
--             ファイルの中身が実際に画像かどうかは確認しない
-- 【対象】20260926120000_harden_rls.sql の適用後
-- 【直すもの】エラーになった形式を、エラーになったバケットの許可リストに1つだけ追加する。
--             他の形式・他のバケットの制限と、サイズの上限はそのまま保つ（画面を通さないアップロードにも制限を効かせるため）
-- 使い方: 下の <BUCKET> と <MIME> を、エラーになったバケット名（avatars / study-logs / material-images）と
--         形式に置き換えて実行する。形式は画面が許可している image/jpeg / image/png / image/webp / image/gif の
--         4つからだけ選べる（例: image/png）。置き換え忘れや、それ以外の形式はエラーで止まる
-- 何度実行しても同じ結果になる（冪等）。本番で実行した場合は README の「実行後の反映手順」に従うこと
BEGIN;

DO $$
DECLARE
  target_bucket text := '<BUCKET>';
  new_mime      text := '<MIME>';
BEGIN
  IF target_bucket NOT IN ('avatars', 'study-logs', 'material-images') THEN
    RAISE EXCEPTION 'バケット名が不正です: %', target_bucket;
  END IF;
  -- 画面側の検証（src/lib/imageValidation.ts）が許可している形式に限る
  IF new_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    RAISE EXCEPTION '形式は image/jpeg / image/png / image/webp / image/gif のいずれかを指定してください: %', new_mime;
  END IF;

  UPDATE storage.buckets
  SET allowed_mime_types = array_append(allowed_mime_types, new_mime)
  WHERE id = target_bucket
    AND allowed_mime_types IS NOT NULL
    AND NOT (new_mime = ANY (allowed_mime_types));
END $$;

-- 確認: 対象バケットの allowed_mime_types に追加した形式が含まれ、他のバケットは変わっていないこと
SELECT id, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'study-logs', 'material-images')
ORDER BY id;

COMMIT;
