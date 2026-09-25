// 画面操作によるログイン
import { expect, type Page } from '@playwright/test';
import type { TestUser } from './testUser';

export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('メールアドレスを入力').fill(user.email);
  await page.getByRole('button', { name: 'メールで続ける' }).click();
  await page.getByLabel('パスワード', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/home$/);
}
