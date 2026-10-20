// ホームのタイムラインの操作
import type { Locator, Page } from '@playwright/test';

// 指定したメモを含むタイムラインの1件（カード）を返す
export function timelineItem(page: Page, memo: string): Locator {
  return page.getByRole('article').filter({ hasText: memo });
}

// 自分の記録の「…」メニューから項目（「編集」「削除」）を選ぶ
export async function chooseTimelineItemMenu(
  page: Page,
  memo: string,
  menu: '編集' | '削除',
): Promise<void> {
  await timelineItem(page, memo).getByRole('button', { name: '記録のメニュー' }).click();
  await page.getByRole('menuitem', { name: menu }).click();
}
