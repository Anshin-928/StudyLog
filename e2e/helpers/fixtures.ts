// specファイルは @playwright/test ではなくこのファイルから test / expect を import する
//
// - testUser:     テストごとに新規作成し、テスト終了時に削除するユーザー（他テストと状態を共有しない）
// - loggedInPage: testUser でログイン済みの page
import { test as base, expect, type Page } from '@playwright/test';
import { loginViaUi } from './auth';
import { createTestUser, deleteTestUser, type TestUser } from './testUser';

type Fixtures = {
  testUser: TestUser;
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
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
