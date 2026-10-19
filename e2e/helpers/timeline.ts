// ホームのタイムラインの操作
import type { Locator, Page } from '@playwright/test';

// 指定したメモを含むタイムラインの1件（カード）を返す
// カードや「…」ボタンにはロール・ラベルが無いため、メモの文字列と、MUIのアイコンが付与する data-testid で特定する。
// メモと「…」アイコンを両方含む要素のうち最も内側（DOM順で最後）がカード本体になる
export function timelineItem(page: Page, memo: string): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ hasText: memo })
    .filter({ has: page.getByTestId('MoreHorizIcon') })
    .last();
}

// 自分の記録の「…」メニューから項目（「編集」「削除」）を選ぶ
export async function chooseTimelineItemMenu(
  page: Page,
  memo: string,
  menu: '編集' | '削除',
): Promise<void> {
  await timelineItem(page, memo)
    .getByRole('button')
    .filter({ has: page.getByTestId('MoreHorizIcon') })
    .click();
  await page.getByRole('menuitem', { name: menu }).click();
}
