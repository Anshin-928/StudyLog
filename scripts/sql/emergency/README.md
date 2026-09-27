# 緊急時のSQL（RLS強化の反映で問題が起きたとき）

`20260926120000_harden_rls.sql`（前半）と `20260926120100_after_frontend_deploy.sql`（後半）を本番に反映した後、
症状が出たときに使う。**症状ごとに、その症状に必要な権限だけを直す。** 旧ポリシーを丸ごと復元すると、
塞いだ脆弱性が再び開くため、行わない。

どのファイルも何度実行しても同じ結果になり（冪等）、`BEGIN` / `COMMIT` で囲んである。
最後の `SELECT` の結果が、ファイルに書かれた「確認」と一致することを確かめる。

## 症状と使うファイル

| 症状 | ファイル | 保ったままにする制限 |
|---|---|---|
| 非公開アカウントがフォロー申請を承認できない | `e1_follow_approval.sql` | 申請した側は自分で accepted にできない |
| タイムラインやプロフィールで教材名・カテゴリが表示されない | `e2_material_visibility.sql` | 非公開アカウントの教材は本人と承認済みフォロワーにだけ見える |
| 特定の形式の画像だけ「mime type ... is not supported」で失敗する | `e3a_add_mime_type.sql`（バケットと形式を指定） | 他の形式・他のバケット・サイズの上限はそのまま。追加できるのは画面が許可している4形式（JPG・PNG・WebP・GIF）だけ |
| 大きい画像が「exceeded the maximum allowed size」で失敗する | `e3b_raise_size_limit.sql`（バケットと上限を指定） | 上限は外さない（画面と同じ10MiB以下）。他のバケットと形式の制限はそのまま |
| **前半だけ適用した状態で**、画像アップロードが RLS のエラーで失敗する | `e4a_upload_policy_after_first.sql` | 未ログイン・他人のフォルダは拒否。旧画面用の `public/` は許可したまま |
| **後半まで適用した状態で**、新しい画面の画像アップロードが RLS のエラーで失敗する | `e4b_upload_policy_after_final.sql` | 未ログイン・他人のフォルダ・`public/` は拒否 |
| 後半の適用後、旧画面の画像アップロード失敗が多く、案内では追いつかない | `e5_reopen_legacy_path.sql` | 未ログインのアップロードは拒否。登録有無を調べられる RPC は戻さない |
| 新規登録でプロフィールが作られない、または退会できない | まず `e6_diagnose_signup_withdrawal.sql`（読み取りのみ）で原因を調べる | — |
| └ 診断で、ログイン済みユーザーが `delete_user` を実行できない | `e6a_grant_delete_user.sql` | 未ログインには付与しない。関数の中身と search_path（空）は変えない |
| └ 診断で、新規登録のトリガーがない・無効 | `e6b_restore_signup_trigger.sql` | 関数の中身・実行権限・search_path（空）は変えない |

`e3a` / `e3b` は、**画面側の検証（`src/lib/imageValidation.ts`: JPG・PNG・WebP・GIF、10MiBまで）では許可されているのに、
バケットの設定で拒否される場合**の修復用。画面側で許可していない形式（HEIC など）や10MiBを超える画像は、実行しても
アップロードできない（画面側の変更とデプロイが必要で、緊急SQLの範囲外）。また、バケットの形式の制限が確認するのは
アップロード時に申告される形式（Content-Type）だけで、ファイルの中身が実際に画像かどうかは確認しない。

`e4a` と `e4b` は、実行する時点の状態を取り違えると別の問題を起こす（前半の状態で `e4b` → 旧画面のアップロードが失敗、
後半の状態で `e4a` → 閉じた `public/` が再び開く）。実行前に `npx supabase migration list --linked` で、
Remote に `20260926120100` があるか（後半まで適用済みか）を確かめる。

`e6` の診断に当てはまらない場合（権限もトリガーも正常なのに失敗する）は、SQLで直さずに Postgres のログのエラー本文から原因を調べる。
SECURITY DEFINER の関数の search_path は、原因が特定できないまま広げない。

## 症状があっても行わないこと

次の操作は、今回塞いだ脆弱性をそのまま再び開くため、どの症状でも行わない。

- `follows` の旧ポリシー `"Users can manage their own follows"`（FOR ALL）や `follows_insert` を復元する
  → 非公開アカウントの記録を、承認なしで見られるようになる
- Storage の旧ポリシー `"Public insert study-logs"` / `"画像アップロード許可"` を復元する
  → 未ログインでも任意の場所にファイルを置けるようになる
- `check_user_provider` を作り直す
  → 誰でもメールアドレスの登録有無と登録方法を調べられるようになる。旧画面のメールログイン失敗は、再読み込みの案内で対応する

上の表にない症状が出たときは、新しいSQLを本番で書き始めず、まずローカルで症状を再現して原因を特定する。

## 実行後の反映手順

本番の SQL Editor でファイルを実行すると、本番のDBとリポジトリのマイグレーションが食い違う。
このままだと、次に `supabase db reset` したローカルやCIのDBが本番と違う状態になり、e2e が本番を正しく検証できなくなる。
実行したら、同じ日のうちに次の手順でマイグレーションに反映する。

1. 実行したファイルと日時を記録する
2. マイグレーションを作る
   ```bash
   npx supabase migration new emergency_<ファイル名の e1 などを除いた部分>
   ```
   （スクリプトやパイプの中で実行すると、標準入力からSQLを待って止まる。その場合は末尾に `< /dev/null` を付ける）
   できたファイルに、実行したSQLを貼り付ける。**`BEGIN;` / `COMMIT;` の行と、最後の確認用 `SELECT` は削除する**
   （マイグレーションは適用時に1つのトランザクションで実行されるため）
3. 本番では実行済みなので、再実行せずに「適用済み」として記録する
   ```bash
   npx supabase migration repair --status applied <手順2で作ったファイルのタイムスタンプ> --linked
   npx supabase migration list --linked   # Local と Remote の両方に、そのタイムスタンプがあること
   ```
4. 本番とリポジトリのスキーマが一致したことを確かめる
   ```bash
   npx supabase db diff --linked --schema public,storage   # 「No schema changes found」と出ること
   ```
   バケットの設定（`e3a` / `e3b`）は `db diff` の対象外なので、実行した場合は `storage.buckets` を SELECT して、
   マイグレーションを適用したローカルと本番で同じ値になっていることを確かめる。
   診断SQL（`e6_diagnose_signup_withdrawal.sql`）は何も変更しないので、マイグレーションにする必要はない
5. ローカルで `npm run supabase:local:reset` を実行し、e2e を流す。結果に応じてテストを直す
   - `e5` を実行した場合、`e2e/tests/storage/legacy-path-closed.spec.ts` は失敗する（旧パスを再び許可したため）。
     旧パスを再び閉じるまでの間は、このテストを `legacy-path-transition.spec.ts` に戻す
   - `e3a` / `e3b` を実行した場合、マイグレーションには `<BUCKET>` などを実際に使った値に置き換えた後のSQLを貼り付ける
6. マイグレーションとテストの変更をコミットし、PRを作る。CI が成功したらマージする

`e5` は一時的な措置なので、旧画面が落ち着いたら `public/` を閉じるマイグレーションを改めて作り、通常の手順（`--dry-run` → `db push`）で適用する。
