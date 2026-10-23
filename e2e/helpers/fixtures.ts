// specファイルは @playwright/test ではなくこのファイルから test / expect を import する
//
// - testUser:       テストごとに新規作成し、テスト終了時に削除するユーザー（他テストと状態を共有しない）
// - loggedInPage:   testUser でログイン済みの page
// - studyLogImages: testUser の記録の画像（Storage）を用意する。テスト終了時に testUser のフォルダの画像をすべて削除する
// - context:        Google Fonts の CSS に外部へ通信せず空の CSS を返す（すべてのテストに適用）
import { test as base, expect, type Page } from '@playwright/test';
import { loginViaUi } from './auth';
import { removeAllStudyLogImages, uploadStudyLogImage, type StudyLogImage } from './studyLogImage';
import { createTestUser, deleteTestUser, type TestUser } from './testUser';

type Fixtures = {
  testUser: TestUser;
  loggedInPage: Page;
  studyLogImages: { upload: (name: string) => Promise<StudyLogImage> };
};

export const test = base.extend<Fixtures>({
  // Google Fonts の CSS（LandingPage.tsx が読み込む）への通信は、まれに終わらないことがある。
  // 以前は index.html で読み込んでいてアプリの起動まで止まり、テストが失敗していた。いまは起動は止まらないが、
  // 外部サービスの調子でテスト結果が変わらないよう、引き続き外部へ通信させない
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

  // Storage のファイルはユーザー削除では消えない。テストで用意した画像だけでなく、画面の操作でアップロードされた画像や、
  // 「消えたこと」を確かめるテストが失敗して残った画像も消すため、ファイル名ではなくユーザーのフォルダごと削除する
  studyLogImages: async ({ testUser }, use) => {
    await use({ upload: (name) => uploadStudyLogImage(testUser, name) });
    await removeAllStudyLogImages(testUser.id);
  },
});

export { expect };
