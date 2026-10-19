// ホームのタイムラインから自分の記録を編集する
// 記録は画面から作らず DB に直接用意する（作成の画面操作は create-record.spec.ts で検証している）
import { test, expect } from '../../helpers/fixtures';
import { createStudyLog, findStudyLog } from '../../helpers/studyLog';
import { chooseTimelineItemMenu, timelineItem } from '../../helpers/timeline';

test.describe('記録の編集', () => {
  test('メモを書き換えて「変更」を押すと、タイムラインとDBに反映される', async ({
    loggedInPage: page,
    testUser,
  }) => {
    // 並列実行中の別テストの記録と衝突しないよう一意にする
    const beforeMemo = `編集前のメモ ${testUser.id}`;
    const afterMemo = `編集後のメモ ${testUser.id}`;
    const logId = await createStudyLog(testUser.id, { memo: beforeMemo });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, beforeMemo, '編集');

    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    const memoField = dialog.getByPlaceholder('要点・ひとことメモ');
    await expect(memoField).toHaveValue(beforeMemo);
    await memoField.fill(afterMemo);
    await dialog.getByRole('button', { name: '変更' }).click();

    await expect(dialog).toBeHidden();
    await expect(timelineItem(page, afterMemo)).toBeVisible();
    await expect(page.getByText(beforeMemo)).toHaveCount(0);
    expect((await findStudyLog(logId))?.memo).toBe(afterMemo);
  });

  test('「キャンセル」で閉じると、書き換えたメモは保存されない', async ({
    loggedInPage: page,
    testUser,
  }) => {
    const memo = `キャンセルされる記録のメモ ${testUser.id}`;
    const discardedMemo = `保存されないメモ ${testUser.id}`;
    const logId = await createStudyLog(testUser.id, { memo });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');

    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    const memoField = dialog.getByPlaceholder('要点・ひとことメモ');
    await expect(memoField).toHaveValue(memo);
    await memoField.fill(discardedMemo);
    await dialog.getByRole('button', { name: 'キャンセル' }).click();

    await expect(dialog).toBeHidden();
    await expect(timelineItem(page, memo)).toBeVisible();
    await expect(page.getByText(discardedMemo)).toHaveCount(0);
    expect((await findStudyLog(logId))?.memo).toBe(memo);
  });
});
