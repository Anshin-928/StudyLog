// 新しい版を公開したときの Service Worker と画面ファイルの扱いの検証
// - 以前の版が Supabase の API 応答を保存していた 'supabase-cache' を、新しい Service Worker が有効になったときと
//   その後のページの読み込みのたび（public/sw-legacy-cache-cleanup.js）に削除すること
//   （e2e の開発サーバーでは PWA の Service Worker は動かないため、このスクリプトを直接登録して確かめる）
// - 画面のファイルを読み込めなかったら1回だけ自動で読み込み直し、それでも失敗したら繰り返さずにエラーを出すこと。
//   読み込み直した後に表示できていれば、次の公開のときにもまた自動で読み込み直すこと。
//   画面のコードの不具合（実行中の例外）では読み込み直さず、通信の問題とは別のエラーを出すこと。存在しない URL は不具合として扱わないこと
//   （src/lib/lazyWithReload.ts。本番では Vercel が存在しないチャンクに index.html を 200 で返すので、同じ応答で再現する）
import type { Page } from '@playwright/test';
import { test, expect } from '../../helpers/fixtures';

const LEGACY_CACHE = 'supabase-cache';
const AUTH_PAGE_MODULE = '**/src/components/AuthPage.tsx*';
const TERMS_PAGE_MODULE = '**/src/components/TermsOfServicePage.tsx*';

function putLegacyCache(page: Page) {
  return page.evaluate(async (name) => {
    const cache = await caches.open(name);
    await cache.put('http://127.0.0.1:54321/auth/v1/user', new Response('{"email":"someone@example.com"}'));
  }, LEGACY_CACHE);
}

function hasLegacyCache(page: Page) {
  return page.evaluate((name) => caches.has(name), LEGACY_CACHE);
}

// 古いビルドのチャンクを取りに行ったときの Vercel の応答（index.html）を、times 回まで（省略時は何回でも）返す。
// page.route の times は使わない。回数に達して経路が外れると、そのとき始まった読み込み直しの通信が止まったままになることがある
async function serveIndexHtmlFor(page: Page, pattern: string, times = Infinity) {
  const indexHtml = await (await page.request.get('/')).text();
  let served = 0;
  await page.route(pattern, (route) => {
    if (served >= times) return route.fallback();
    served += 1;
    return route.fulfill({ status: 200, contentType: 'text/html', body: indexHtml });
  });
}

// ページ本体（index.html）を読み込んだ回数を数える（ページ内の画面遷移は数えない）
function countDocumentLoads(page: Page) {
  const counter = { value: 0 };
  page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) counter.value += 1; });
  return counter;
}

test.describe('新しい版の公開', () => {
  test('新しい Service Worker が有効になると、以前の API 応答のキャッシュを削除する', async ({ page }) => {
    await page.goto('/login');
    await putLegacyCache(page);

    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/sw-legacy-cache-cleanup.js');
      // activate の処理（waitUntil）が終わると activated になる。ready は有効化の途中で解決するので使わない。
      // インストールや有効化に失敗したら redundant になるので、待ち続けずに失敗させる
      const worker = registration.installing ?? registration.waiting ?? registration.active;
      if (!worker) throw new Error('Service Worker を登録できませんでした');
      if (worker.state === 'activated') return;
      await new Promise<void>((resolve, reject) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
          if (worker.state === 'redundant') reject(new Error('Service Worker のインストールか有効化に失敗しました'));
        });
      });
    });

    try {
      expect(await hasLegacyCache(page)).toBe(false);

      // 切り替わった時点で古い版が処理中だった通信が、削除した後にキャッシュを作り直した場合も、以後のページの読み込みで削除する
      await putLegacyCache(page);
      await page.goto('/pwa-192.png');
      expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
      await expect.poll(() => hasLegacyCache(page)).toBe(false);
    } finally {
      await page.evaluate(async () => {
        await Promise.all((await navigator.serviceWorker.getRegistrations()).map((registration) => registration.unregister()));
      });
    }
  });

  test('画面のファイルを読み込めなければ、自動で読み込み直して表示する', async ({ page }) => {
    await serveIndexHtmlFor(page, AUTH_PAGE_MODULE, 1);
    const documentLoads = countDocumentLoads(page);

    await page.goto('/login');

    await expect(page.getByLabel('メールアドレスを入力')).toBeVisible();
    expect(documentLoads.value).toBe(2);
  });

  test('自動で読み込み直して表示できた後も、次に読み込めなかったときにまた読み込み直す', async ({ page }) => {
    await serveIndexHtmlFor(page, AUTH_PAGE_MODULE, 1);
    const documentLoads = countDocumentLoads(page);
    await page.goto('/login');
    await expect(page.getByLabel('メールアドレスを入力')).toBeVisible();
    expect(documentLoads.value).toBe(2);

    // 開いたままの間に次の版が公開され、別の画面のファイルを読み込めなくなった
    await serveIndexHtmlFor(page, TERMS_PAGE_MODULE, 1);
    await page.getByRole('link', { name: '利用規約' }).click();

    await expect(page.getByText('本利用規約（以下「本規約」）')).toBeVisible();
    expect(documentLoads.value).toBe(3);
  });

  test('読み込み直しても失敗したら、繰り返さずにエラーを出し、再読み込みで表示できる', async ({ page }) => {
    await serveIndexHtmlFor(page, AUTH_PAGE_MODULE);
    const documentLoads = countDocumentLoads(page);

    await page.goto('/login');

    await expect(page.getByRole('alert')).toContainText('画面を表示できませんでした');
    expect(documentLoads.value).toBe(2);

    await page.unroute(AUTH_PAGE_MODULE);
    await page.getByRole('button', { name: '再読み込み' }).click();

    await expect(page.getByLabel('メールアドレスを入力')).toBeVisible();
  });

  test('画面のコードが実行中に例外を投げたら、読み込み直さずに通信の問題ではないエラーを出す', async ({ page }) => {
    await page.route(AUTH_PAGE_MODULE, (route) => route.fulfill({
      status: 200, contentType: 'text/javascript', body: 'throw new Error("画面のコードの不具合");',
    }));
    const documentLoads = countDocumentLoads(page);

    await page.goto('/login');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('画面を表示できませんでした');
    await expect(alert).toContainText('予期しないエラーが発生しました');
    await expect(alert).not.toContainText('通信状況を確認');
    expect(documentLoads.value).toBe(1);
  });

  test('存在しない URL では、不具合ではなくページが見つからないことを伝える', async ({ page }) => {
    await page.goto('/no-such-page');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('ページが見つかりませんでした');
    await expect(alert).not.toContainText('予期しないエラーが発生しました');
  });
});
