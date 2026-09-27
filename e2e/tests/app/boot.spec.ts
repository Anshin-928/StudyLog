// 起動前の準備（src/lib/serviceWorkerBoot.ts）の検証
// 以前の Service Worker が Supabase の API 応答を保存していた 'supabase-cache' を、アプリを起動する前に削除すること。
// 削除に失敗したら、API を呼ぶ画面を起動せずにエラーと再試行を出すこと
// （e2e の開発サーバーでは Service Worker は動かないため、ここではキャッシュの削除と失敗時の画面だけを確かめる）
import { test, expect } from '../../helpers/fixtures';

const LEGACY_CACHE = 'supabase-cache';

test.describe('起動前の準備', () => {
  test('以前の API 応答のキャッシュを削除してから起動する', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async (name) => {
      const cache = await caches.open(name);
      await cache.put('http://127.0.0.1:54321/auth/v1/user', new Response('{"email":"someone@example.com"}'));
    }, LEGACY_CACHE);

    await page.reload();

    await expect.poll(() => page.evaluate(() => performance.getEntriesByName('studylog:boot-ready').length)).toBe(1);
    expect(await page.evaluate((name) => caches.has(name), LEGACY_CACHE)).toBe(false);
  });

  test('キャッシュを削除できなければ、API を呼ばずにエラーを出し、再試行で起動できる', async ({ page }) => {
    await page.addInitScript(() => {
      const original = caches.delete.bind(caches);
      const w = window as unknown as { __failCacheDelete?: boolean };
      w.__failCacheDelete = true;
      caches.delete = (name: string) => (w.__failCacheDelete ? Promise.reject(new Error('injected')) : original(name));
    });

    await page.goto('/login');

    await expect(page.getByRole('alert')).toContainText('アプリを起動できませんでした');
    const apiCalls = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter((e) => e.name.includes('/rest/v1/') || e.name.includes('/auth/v1/')).length);
    expect(apiCalls).toBe(0);

    await page.evaluate(() => { (window as unknown as { __failCacheDelete?: boolean }).__failCacheDelete = false; });
    await page.getByRole('button', { name: '再試行' }).click();

    await expect(page.getByLabel('メールアドレスを入力')).toBeVisible();
  });
});
