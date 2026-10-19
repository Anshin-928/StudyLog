// ホームのタイムラインから自分の記録を削除する
// 記録は画面から作らず DB に直接用意する（作成の画面操作は create-record.spec.ts で検証している）
import { test, expect } from '../../helpers/fixtures';
import { createStudyLog, findStudyLog } from '../../helpers/studyLog';
import { chooseTimelineItemMenu, timelineItem } from '../../helpers/timeline';

test.describe('記録の削除', () => {
  test('削除を確定すると、選んだ記録だけがタイムラインとDBから消える', async ({
    loggedInPage: page,
    testUser,
  }) => {
    // 並列実行中の別テストの記録と衝突しないよう一意にする
    const targetMemo = `削除する記録 ${testUser.id}`;
    const keptMemo = `残す記録 ${testUser.id}`;
    const targetId = await createStudyLog(testUser.id, { memo: targetMemo });
    const keptId = await createStudyLog(testUser.id, {
      memo: keptMemo,
      studyDatetime: new Date(Date.now() - 60 * 60 * 1000),
    });

    await page.goto('/home');
    await expect(timelineItem(page, keptMemo)).toBeVisible();
    await chooseTimelineItemMenu(page, targetMemo, '削除');

    const dialog = page.getByRole('dialog', { name: '記録を削除' });
    await dialog.getByRole('button', { name: '削除' }).click();

    await expect(dialog).toBeHidden();
    // 削除後はタイムラインを再取得する（読み込み中は一覧ごと消える）ため、残す記録が再表示されるのを待ってから確認する
    await expect(timelineItem(page, keptMemo)).toBeVisible();
    await expect(page.getByText(targetMemo)).toHaveCount(0);
    expect(await findStudyLog(targetId)).toBeNull();
    expect(await findStudyLog(keptId)).not.toBeNull();

    // 再読み込みしても戻ってこない（画面の表示だけ消えたのではない）
    await page.reload();
    await expect(timelineItem(page, keptMemo)).toBeVisible();
    await expect(page.getByText(targetMemo)).toHaveCount(0);
  });

  test('削除の確認で「キャンセル」を押すと、記録は残る', async ({
    loggedInPage: page,
    testUser,
  }) => {
    const memo = `削除をキャンセルする記録 ${testUser.id}`;
    const logId = await createStudyLog(testUser.id, { memo });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '削除');

    const dialog = page.getByRole('dialog', { name: '記録を削除' });
    await dialog.getByRole('button', { name: 'キャンセル' }).click();

    await expect(dialog).toBeHidden();
    await expect(timelineItem(page, memo)).toBeVisible();
    expect(await findStudyLog(logId)).not.toBeNull();
  });
});
