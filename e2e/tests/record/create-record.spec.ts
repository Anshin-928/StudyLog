import { test, expect } from '../../helpers/fixtures';

test.describe('記録の追加', () => {
  test('記録を追加するとホームのタイムラインに表示される', async ({ loggedInPage: page, testUser }) => {
    // 他ユーザーの記録も表示される画面で並列実行中の別テストの記録と衝突しないよう一意にする
    const memo = `e2eテストの記録メモ ${testUser.id}`;

    await page.goto('/record');
    await page.getByText('教材を選択').first().click();
    await page.getByText('「教材なし」として記録します').click();
    await page.getByPlaceholder('要点・ひとことメモ').fill(memo);
    await page.getByRole('main').getByRole('button', { name: '記録する' }).click();
    await expect(page).toHaveURL(/\/report$/);

    await page.goto('/home');
    await expect(page.getByText(memo)).toBeVisible();
  });
});
