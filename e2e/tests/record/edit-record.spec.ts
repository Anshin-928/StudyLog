// ホームのタイムラインから自分の記録を編集する
// 記録は画面から作らず DB に直接用意する（作成の画面操作は create-record.spec.ts で検証している）
import type { Page } from '@playwright/test';
import { test, expect } from '../../helpers/fixtures';
import {
  createMaterial,
  createStudyLog,
  deleteStudyLog,
  findStudyLog,
  setStudyLogImageUrl,
} from '../../helpers/studyLog';
import {
  PNG,
  listStudyLogImagePaths,
  studyLogImageExists,
  studyLogImagePathFromPublicUrl,
} from '../../helpers/studyLogImage';
import { chooseTimelineItemMenu, timelineItem } from '../../helpers/timeline';

// 画像の欄（文言は画像の有無で変わる）を押して開くファイル選択で、小さな PNG を選ぶ
async function chooseImage(page: Page, imageCellText: string, fileName: string): Promise<void> {
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('dialog', { name: '記録の編集' }).getByText(imageCellText).click();
  await (await fileChooser).setFiles({ name: fileName, mimeType: 'image/png', buffer: PNG });
}

// アプリが画像をアップロードしたときの、バケット内のパスを返す（アップロードが成功したことも確かめる）
async function waitForImageUpload(page: Page): Promise<string> {
  const response = await page.waitForResponse(
    (res) =>
      res.request().method() === 'POST' && res.url().includes('/storage/v1/object/study-logs/'),
  );
  expect(response.ok()).toBe(true);
  const { pathname } = new URL(response.url());
  return decodeURI(pathname.slice(pathname.indexOf('/study-logs/') + '/study-logs/'.length));
}

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

  test('別の端末で削除済みの記録を保存しようとすると、そのことが表示され、タイムラインからも消える', async ({
    loggedInPage: page,
    testUser,
  }) => {
    const memo = `別の端末で削除済みの記録のメモ ${testUser.id}`;
    const keptMemo = `残す記録のメモ ${testUser.id}`;
    const logId = await createStudyLog(testUser.id, { memo });
    await createStudyLog(testUser.id, {
      memo: keptMemo,
      studyDatetime: new Date(Date.now() - 60 * 60 * 1000),
    });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');

    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    const memoField = dialog.getByPlaceholder('要点・ひとことメモ');
    await expect(memoField).toHaveValue(memo);
    // ダイアログを開いた後で消しておき、更新が0件になる状況を作る
    await deleteStudyLog(logId);
    await memoField.fill(`書き換えたメモ ${testUser.id}`);
    await dialog.getByRole('button', { name: '変更' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('alert')).toHaveText(
      '記録が見つかりませんでした。すでに削除されている可能性があります。',
    );
    // 一覧を取り直すため、残す記録が再表示されるのを待ってから、古いカードが消えたことを確かめる
    await expect(timelineItem(page, keptMemo)).toBeVisible();
    await expect(timelineItem(page, memo)).toHaveCount(0);
  });

  test('保存に失敗した後、学習量を変えずに「決定」を押しても、エラーの表示は消えない', async ({
    loggedInPage: page,
    testUser,
  }) => {
    const memo = `保存に失敗する記録のメモ ${testUser.id}`;
    const materialId = await createMaterial(testUser.id, `教材 ${testUser.id}`);
    await createStudyLog(testUser.id, { memo, materialId });
    // 記録の更新（PATCH）だけをサーバーのエラーにする。一覧の取得などはそのまま通す
    await page.route('**/rest/v1/study_logs?*', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 500, json: { message: 'e2e で失敗させた更新' } })
        : route.fallback(),
    );

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');
    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    // 学習量のセルは教材を取得し終えてから表示される
    const pagesCell = dialog.getByText('学習量を入力（ページ）');
    await expect(pagesCell).toBeVisible();
    await dialog.getByRole('button', { name: '変更' }).click();
    const saveError = dialog.getByRole('alert');
    await expect(saveError).toHaveText('保存に失敗しました。時間をおいて再度お試しください。');

    await pagesCell.click();
    const pagesDialog = page.getByRole('dialog', { name: '学習量を入力' });
    await pagesDialog.getByRole('button', { name: '決定' }).click();
    await expect(pagesDialog).toBeHidden();

    await expect(saveError).toHaveText('保存に失敗しました。時間をおいて再度お試しください。');
  });

  test('画像を選び直さずに保存すると、開いた後に別の端末で差し替えられた画像はそのまま残る', async ({
    loggedInPage: page,
    testUser,
  }) => {
    const memo = `別の端末で画像を差し替えられる記録のメモ ${testUser.id}`;
    // 実在しなくてよい。記録が指す URL が書き戻されないことだけを確かめる
    const replacedImageUrl = `http://127.0.0.1:54321/storage/v1/object/public/study-logs/${testUser.id}/replaced.jpg`;
    const logId = await createStudyLog(testUser.id, { memo });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');
    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    const memoField = dialog.getByPlaceholder('要点・ひとことメモ');
    await expect(memoField).toHaveValue(memo);
    // ダイアログを開いた後で、別の端末が画像を差し替えた状況を作る
    await setStudyLogImageUrl(logId, replacedImageUrl);
    await memoField.fill(`書き換えたメモ ${testUser.id}`);
    await dialog.getByRole('button', { name: '変更' }).click();
    await expect(dialog).toBeHidden();

    expect((await findStudyLog(logId))?.image_url).toBe(replacedImageUrl);
  });

  test('画像を差し替えて保存すると、前の画像が Storage から消え、記録は新しい画像を指す', async ({
    loggedInPage: page,
    testUser,
    studyLogImages,
  }) => {
    const memo = `画像を差し替える記録のメモ ${testUser.id}`;
    const oldImage = await studyLogImages.upload('old');
    const logId = await createStudyLog(testUser.id, { memo });
    await setStudyLogImageUrl(logId, oldImage.publicUrl);

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');
    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    await chooseImage(page, '添付画像（変更する場合はタップ）', 'new.png');
    await expect(dialog.getByText('new.png')).toBeVisible();
    const uploadedPath = waitForImageUpload(page);
    await dialog.getByRole('button', { name: '変更' }).click();
    const newPath = await uploadedPath;

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('alert')).toHaveText('記録を更新しました');
    // アップロード先は自分のフォルダ（<ユーザーID>/<時刻>_<ランダム>.png）
    expect(newPath).toMatch(new RegExp(`^${testUser.id}/\\d+_[0-9a-z]+\\.png$`));
    const imageUrl = (await findStudyLog(logId))?.image_url ?? null;
    expect(imageUrl && studyLogImagePathFromPublicUrl(imageUrl)).toBe(newPath);
    // 前の画像の削除は完了を待たずに行われる。記録の更新を確かめた後で、消えるのを待つ
    await expect.poll(() => studyLogImageExists(oldImage.path)).toBe(false);
    expect(await listStudyLogImagePaths(testUser.id)).toEqual([newPath]);
  });

  test('画像を選んで保存したときに別の端末で記録が削除されていたら、今回アップロードした画像は Storage から消える', async ({
    loggedInPage: page,
    testUser,
    // 使わないが、画面の操作でアップロードされた画像がテストの失敗時に残らないよう、終了時の削除のために受け取る
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    studyLogImages,
  }) => {
    const memo = `画像を選んだ後に別の端末で削除される記録のメモ ${testUser.id}`;
    const keptMemo = `残す記録のメモ ${testUser.id}`;
    const logId = await createStudyLog(testUser.id, { memo });
    await createStudyLog(testUser.id, {
      memo: keptMemo,
      studyDatetime: new Date(Date.now() - 60 * 60 * 1000),
    });

    await page.goto('/home');
    await chooseTimelineItemMenu(page, memo, '編集');
    const dialog = page.getByRole('dialog', { name: '記録の編集' });
    await chooseImage(page, '画像を添付', 'new.png');
    await expect(dialog.getByText('new.png')).toBeVisible();
    // ダイアログを開いた後で消しておき、更新が0件になる状況を作る
    await deleteStudyLog(logId);
    const uploadedPath = waitForImageUpload(page);
    await dialog.getByRole('button', { name: '変更' }).click();
    const newPath = await uploadedPath;

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('alert')).toHaveText(
      '記録が見つかりませんでした。すでに削除されている可能性があります。',
    );
    await expect(timelineItem(page, keptMemo)).toBeVisible();
    // アップロードされた画像は、0件更新と分かった後に完了を待たずに消される
    await expect.poll(() => studyLogImageExists(newPath)).toBe(false);
  });
});
