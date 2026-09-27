// メールアドレスの登録有無を第三者に知られないこと（アカウント列挙対策）の検証
import type { Page } from '@playwright/test';
import { test, expect } from '../../helpers/fixtures';
import { deleteSignedUpUser, signUpEmailForCurrentRun } from '../../helpers/testUser';

const SIGNUP_PASSWORD = 'e2e-signup-password-123';

// 新規登録を試み、表示されたアラートの文言をすべて返す
async function trySignUp(page: Page, email: string): Promise<string[]> {
  await page.goto('/login');
  await page.getByLabel('メールアドレスを入力').fill(email);
  await page.getByRole('button', { name: 'メールで続ける' }).click();
  await page.getByRole('button', { name: '新規登録' }).click();
  await page.getByLabel('パスワード', { exact: true }).fill(SIGNUP_PASSWORD);
  await page.getByLabel('パスワード（確認用）').fill(SIGNUP_PASSWORD);
  await page.getByRole('button', { name: 'アカウントを作成' }).click();

  await expect(page.getByRole('button', { name: '確認する' })).toBeVisible();
  return page.getByRole('alert').allInnerTexts();
}

test.describe('メールアドレスの登録有無を明かさない', () => {
  test('メール入力後はログインから始まり、新規登録に切り替えられる', async ({ page, testUser }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレスを入力').fill(testUser.email);
    await page.getByRole('button', { name: 'メールで続ける' }).click();
    await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();

    await page.getByRole('button', { name: '新規登録' }).click();
    await expect(page.getByLabel('パスワード（確認用）')).toBeVisible();
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible();

    await page.getByRole('button', { name: 'ログイン画面へ' }).click();
    await expect(page.getByRole('button', { name: 'ログイン', exact: true })).toBeVisible();
  });

  test('登録済みと未登録のメールアドレスで、新規登録の結果が同じ表示になる', async ({ page, testUser }) => {
    const registered = await trySignUp(page, testUser.email);

    const newEmail = signUpEmailForCurrentRun();
    try {
      const unregistered = await trySignUp(page, newEmail);

      expect(registered).toEqual([`${testUser.email} に確認コードを送信しました。`]);
      expect(unregistered).toEqual([`${newEmail} に確認コードを送信しました。`]);
    } finally {
      await deleteSignedUpUser(newEmail);
    }
  });
});
