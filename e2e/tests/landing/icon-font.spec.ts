// ランディングページのアイコンフォント（Material Icons Outlined）の読み込みと、アイコンの表示
// - フォントを読み込めたらアイコンを表示する（src/features/landing/LandingPage.tsx）
// Google Fonts には通信せず、CSS とフォントファイルをテスト内で返す
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test, expect } from '../../helpers/fixtures';

const ICON_STYLESHEET = 'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined';
const ICON_FONT_FILE = 'https://fonts.gstatic.com/e2e/material-icons-outlined.ttf';

// 実際のアイコンフォントの代わりに返すフォントファイル。Playwright に同梱されている codicon.ttf を使う
// （フォントとして読み込めれば中身の形は何でもよい。ファイルをリポジトリに置かずに済む）
function stubFontPath(): string {
  const require = createRequire(import.meta.url);
  const playwrightTest = dirname(require.resolve('@playwright/test/package.json'));
  const core = dirname(
    require.resolve('playwright-core/package.json', { paths: [playwrightTest] }),
  );
  const dir = join(core, 'lib/vite/traceViewer');
  const file = readdirSync(dir).find((name) => /^codicon.*\.ttf$/.test(name));
  if (!file) throw new Error(`${dir} に codicon の ttf が見つかりません`);
  return join(dir, file);
}

test.describe('アイコンフォントの表示', () => {
  test('アイコンフォントが空白文字を含まない unicode-range で配信されても、読み込めればアイコンを表示する', async ({
    page,
  }) => {
    // アイコン名（ligature）に使う英小文字と _ だけを対象にしたフォント。空白（U+0020）は含まない
    await page.route(ICON_STYLESHEET, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: `@font-face {
  font-family: 'Material Icons Outlined';
  src: url(${ICON_FONT_FILE}) format('truetype');
  unicode-range: U+005F, U+0061-007A;
}
.material-icons-outlined { font-family: 'Material Icons Outlined'; }`,
      }),
    );
    await page.route(ICON_FONT_FILE, (route) =>
      route.fulfill({ status: 200, contentType: 'font/ttf', path: stubFontPath() }),
    );

    await page.goto('/');

    await expect(page.getByText('bar_chart')).toBeVisible();
  });
});
