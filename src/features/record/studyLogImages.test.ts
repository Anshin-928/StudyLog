// 勉強記録の画像の公開URLからのパスの取り出し、画像の削除、保存失敗時の後始末の判定
import { describe, expect, test, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import {
  removeStudyLogImage,
  removeStudyLogImageByUrl,
  removeUploadedImageIfRejected,
  studyLogImagePathFromUrl,
} from './studyLogImages';

// vitest.config.ts の VITE_SUPABASE_URL から supabase-js が組み立てる公開URLの先頭
const PUBLIC_PREFIX = 'http://127.0.0.1:54321/storage/v1/object/public/study-logs/';

/**
 * Storage への削除リクエストを差し替え、呼ばれたパスを記録する（Supabase は外部サービスなので実際には送らない）。
 * 公開URLの組み立て（getPublicUrl）は通信しないので、本物の SDK のまま使う。
 * 省略時は、1件削除できたときの応答を返す
 */
function stubRemove(
  result: { data: { name: string }[] | null; error: Error | null } = {
    data: [{ name: 'deleted.jpg' }],
    error: null,
  },
) {
  const remove = vi.fn().mockResolvedValue(result);
  const from = supabase.storage.from.bind(supabase.storage);
  vi.spyOn(supabase.storage, 'from').mockImplementation((bucket) => {
    const api = from(bucket);
    api.remove = remove;
    return api;
  });
  return remove;
}

describe('studyLogImagePathFromUrl', () => {
  test('study-logs バケットの公開URLから、バケット内のパスを取り出す', () => {
    expect(studyLogImagePathFromUrl(`${PUBLIC_PREFIX}user-1/123_abc.jpg`)).toBe(
      'user-1/123_abc.jpg',
    );
  });

  test('クエリ文字列やハッシュはパスに含めない', () => {
    expect(studyLogImagePathFromUrl(`${PUBLIC_PREFIX}user-1/a.jpg?t=1#x`)).toBe('user-1/a.jpg');
  });

  test('エンコードされた文字は元に戻す', () => {
    expect(studyLogImagePathFromUrl(`${PUBLIC_PREFIX}user-1/%E7%94%BB%E5%83%8F.jpg`)).toBe(
      'user-1/画像.jpg',
    );
  });

  test('別のバケットの URL なら null', () => {
    expect(
      studyLogImagePathFromUrl('http://127.0.0.1:54321/storage/v1/object/public/avatars/a.jpg'),
    ).toBeNull();
  });

  test('バケットの直下を指すだけでパスがなければ null', () => {
    expect(studyLogImagePathFromUrl(PUBLIC_PREFIX)).toBeNull();
  });

  test('壊れた % を含む URL でも例外を投げず null を返す', () => {
    // 記録の削除・更新が成功した後の後始末で呼ばれるため、ここで投げると成功した操作が失敗として表示される
    expect(studyLogImagePathFromUrl(`${PUBLIC_PREFIX}user-1/100%.jpg`)).toBeNull();
  });
});

describe('removeStudyLogImage', () => {
  test('1件も削除されなかったら（権限がない場合など）、エラーとして記録する', async () => {
    stubRemove({ data: [], error: null });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await removeStudyLogImage('user-1/old.jpg');

    expect(consoleError).toHaveBeenCalled();
  });

  test('Storage の SDK が例外を投げても投げ返さず、エラーとして記録する', async () => {
    stubRemove().mockRejectedValue(new Error('SDK の中で投げられた例外'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(removeStudyLogImage('user-1/old.jpg')).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });

  test('削除できたらエラーを記録しない', async () => {
    stubRemove();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await removeStudyLogImage('user-1/old.jpg');

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('removeStudyLogImageByUrl', () => {
  test('記録に保存されていた公開URLの画像を消す', () => {
    const remove = stubRemove();

    removeStudyLogImageByUrl(`${PUBLIC_PREFIX}user-1/old.jpg`);

    expect(remove).toHaveBeenCalledWith(['user-1/old.jpg']);
  });

  test('URL が無ければ何もしない', () => {
    const remove = stubRemove();

    removeStudyLogImageByUrl(null);

    expect(remove).not.toHaveBeenCalled();
  });

  test('別のバケットの画像の URL なら消さない', () => {
    const remove = stubRemove();

    removeStudyLogImageByUrl('http://127.0.0.1:54321/storage/v1/object/public/avatars/a.jpg');

    expect(remove).not.toHaveBeenCalled();
  });
});

describe('removeUploadedImageIfRejected', () => {
  const uploaded = { path: 'user-1/new.jpg', publicUrl: `${PUBLIC_PREFIX}user-1/new.jpg` };

  test.each([400, 403, 404, 409])('サーバーが %d で拒否したら、今回の画像を消す', (status) => {
    const remove = stubRemove();

    removeUploadedImageIfRejected(uploaded, status);

    expect(remove).toHaveBeenCalledWith(['user-1/new.jpg']);
  });

  // 408（タイムアウト）・499（接続が途中で切れた）は、サーバー側では保存が終わっていることがある
  test.each([0, 408, 499, 500, 503])(
    'status %d は保存できていた可能性があるので消さない',
    (status) => {
      const remove = stubRemove();

      removeUploadedImageIfRejected(uploaded, status);

      expect(remove).not.toHaveBeenCalled();
    },
  );

  test('今回アップロードした画像がなければ何もしない', () => {
    const remove = stubRemove();

    removeUploadedImageIfRejected(null, 400);

    expect(remove).not.toHaveBeenCalled();
  });
});
