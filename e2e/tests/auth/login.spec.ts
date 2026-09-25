import { test, expect } from '../../helpers/fixtures';
import { loginViaUi } from '../../helpers/auth';

test.describe('メールアドレスでのログイン', () => {
  test('正しいパスワードでログインするとホームに遷移する', async ({ page, testUser }) => {
    await loginViaUi(page, testUser);
  });

  test('パスワードが誤っているとエラーが表示されログインできない', async ({ page, testUser }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレスを入力').fill(testUser.email);
    await page.getByRole('button', { name: 'メールで続ける' }).click();
    await page.getByLabel('パスワード', { exact: true }).fill(`${testUser.password}-wrong`);
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page.getByText('メールアドレスまたはパスワードが正しくありません。')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
