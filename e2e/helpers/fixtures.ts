// specファイルは @playwright/test ではなくこのファイルから test / expect を import する
//
// - testUser:     テストごとに新規作成し、テスト終了時に削除するユーザー（他テストと状態を共有しない）
// - loggedInPage: testUser でログイン済みの page
// - context:      Google Fonts の CSS に外部へ通信せず空の CSS を返す（すべてのテストに適用）
import { test as base, expect, type Page } from '@playwright/test';
import { loginViaUi } from './auth';
import { createTestUser, deleteTestUser, type TestUser } from './testUser';

type Fixtures = {
  testUser: TestUser;
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
  // index.html の Google Fonts の CSS は、読み込みが終わるまで後ろのモジュールスクリプト（アプリ本体）の実行を止める。
  // ページを読み込み直したときにこの通信がまれに終わらず、アプリが起動しないままテストが失敗していたため、外部へ通信させない
  context: async ({ context }, use) => {
    await context.route(/^https:\/\/fonts\.googleapis\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    await use(context);
  },

  // Playwrightのfixtureは第1引数の分割代入が必須なため空パターンにしている
  // eslint-disable-next-line no-empty-pattern
  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    // テストが失敗しても必ず実行される。削除に失敗した場合はテスト自体を失敗扱いにする
    await deleteTestUser(user.id);
  },

  loggedInPage: async ({ page, testUser }, use) => {
    await loginViaUi(page, testUser);
    await use(page);
  },
});

export { expect };
