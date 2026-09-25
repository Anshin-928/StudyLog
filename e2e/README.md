# E2Eテスト

## 最重要事項

**テスト冪等性を必ず守ること。**

- テストの実行順・並列実行の有無によらず、同じコードに対しては常に同じ結果になること
- テスト終了後（成功・失敗を問わず）には、そのテストが作成したテストデータを必ず削除すること
- テストは他のテストが作ったデータや、DBに既に存在するデータを前提にしないこと

これは **テストが失敗したとき、その原因がコードにあることを保証する** ためのものである。
前回の実行の残りデータや他テストとの干渉で落ちるテストは、コードの不具合を検出できないだけでなく、
テスト結果そのものへの信頼を失わせる。

本リポジトリでは以下の仕組みでこれを担保している。新しいテストもこの仕組みに乗せること。

| 仕組み | 内容 |
|---|---|
| `testUser` / `loggedInPage` fixture | テストごとに新規ユーザーを作成し、終了時に削除する。ユーザー削除で関連データは `ON DELETE CASCADE` により全て消える。削除失敗はテスト失敗として扱う |
| 実行ID（`E2E_RUN_ID` / `E2E_RUN_PID`） | 実行ごとにIDを発行し、作成するユーザーの `app_metadata` に実行IDとPlaywright本体のプロセスIDを記録する。削除はこれらで所有を確認したユーザーに限る |
| `global-setup.ts` | アプリとテストデータ操作の接続先が同一のローカルSupabaseであることを確認する。既に終了した過去の実行（中断・強制終了）の残りを回収する。記録されたプロセスが生存している実行のユーザーには、実行時間に関わらず触れない |
| `global-teardown.ts` | この実行が作成して残っているユーザーだけを削除し、1件も残っていないことを検証する（同じDBで動く別の実行には触れない） |
| `retries: 0` | リトライで不安定なテストを隠さない |
| CI（`.github/workflows/ci.yml` の `e2e` ジョブ） | PR・push ごとに、まっさらなDBでe2eを実行し、終了後にテストデータが残っていないことを検証する。テストが失敗した場合も検証する |

## 実行方法

```bash
npm run supabase:local:start                    # Docker Desktopを起動してから実行（ローカルSupabaseはDocker上で動く）
cp .env.e2e.local.example .env.e2e.local        # 初回のみ
npm run test:e2e                                # もしくは npm run test:e2e:ui

npm run test:e2e:headed                         # ブラウザを表示し、1操作0.5秒ずつゆっくり実行

npx playwright test e2e/tests/record            # 特定の機能だけ実行
```

スキーマを初期状態に戻したいときは、実行前に `npm run supabase:local:reset` を実行する（CIでは毎回実行している）。
`supabase/seed.sql` は意図的に空にしている。共有のテストデータは入れないこと。

e2e用のアプリはポート5174で `--mode e2e` として起動され、ローカルSupabaseに接続する。
普段の `npm run dev`（5173、本番Supabase接続）とは別のサーバーなので、起動したままでも問題ない。

実行後にテストデータが残っていないかは `npm run test:e2e:assert-clean` で確認できる。
「残り」とは既に終了した実行が作成したユーザーを指し、実行中の別の実行（UIモード等）のユーザーは対象外になる。

途中で強制終了した場合、その実行のユーザーは次回の実行開始時に回収される。

同じマシンでe2eを同時に2つ起動すると、後から起動した方はポート5174が使用中のためエラーで止まる。
DB側の所有管理は、それでも別の実行のデータに触れないための多重の防御である。

## ディレクトリ構成

```
e2e/
  tests/                  specファイル。機能ごとにフォルダを分ける
    auth/                 ログイン・サインアップ・パスワードリセット
    record/               学習記録の追加・編集・削除
  helpers/                テスト作成でよく使うもの
    fixtures.ts           test / expect の拡張（specはここからimportする）
    auth.ts               ログイン操作
    testUser.ts           テストユーザーの作成・削除
    supabaseAdmin.ts      service roleのSupabaseクライアント（テストデータの直接操作用）
    env.ts                環境変数・ローカル接続の確認
  scripts/
    assert-clean.sh       実行後にテストデータが残っていないことの検証
  global-setup.ts         全体の前処理
  global-teardown.ts      全体の後処理
```

### フォルダ・ファイルの分け方

- `tests/<機能>/<操作>.spec.ts` とする（例: `tests/record/create-record.spec.ts`）
- 機能フォルダはアプリの機能単位で切る。今後増える想定: `home/`（タイムライン・いいね）、`materials/`、`report/`、`profile/`、`follows/`、`settings/`
- 1ファイルには1つの操作に関するテストをまとめ、`test.describe` 名はその操作を表す日本語にする
- 複数のspecで使う処理は spec 内に書かず `helpers/` に置く

## テストを書くときのルール

- `test` / `expect` は `@playwright/test` ではなく `helpers/fixtures` から import する
- ログイン状態が必要なら `loggedInPage` を、ユーザー情報だけ必要なら `testUser` を使う
- 他のユーザーが必要なテスト（フォロー・いいね等）は `createTestUser()` で作り、`deleteTestUser()` で削除する
  - 頻繁に使うようになったら fixture 化して `helpers/fixtures.ts` に追加する
- 必要なデータはテスト内（またはfixture）で作る。既存データの存在を前提にしない
- 他ユーザーの記録も表示される画面（目標グループのタイムライン、ユーザー一覧等）では、並列実行中の別テストのデータも表示されうる
  - 検証に使う文字列は `testUser.id` を含めるなどして一意にする。件数や「空であること」を全体に対して検証しない
- Storageにアップロードしたファイルはユーザー削除では消えないため、使う場合は個別に削除する処理を fixture に入れる
- 要素は `getByRole` / `getByLabel` / `getByText` など、ユーザーから見える情報で取得する
- `page.waitForTimeout` などの固定時間待ちは使わない。`expect(...).toBeVisible()` などの自動待機を使う

## AIにE2Eテストを作成させる場合

`.claude/agents/e2e-test-writer.md` にE2E作成エージェントを定義している。
Claude Code で「e2e-test-writer で○○のE2Eテストを作って」と依頼すると、このREADMEのルールに従ってテストを作成・実行する。
