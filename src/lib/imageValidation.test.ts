// アップロードする画像の検証と、保存時の拡張子
import { describe, expect, test } from 'vitest';
import { MAX_IMAGE_SIZE_BYTES, safeImageExt, validateImageFile } from './imageValidation';

function fileOf(type: string, size = 1): File {
  return new File([new Uint8Array(size)], 'image', { type });
}

describe('validateImageFile', () => {
  test.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])('%s は受け付ける', (type) => {
    expect(validateImageFile(fileOf(type))).toBeNull();
  });

  test('対応していない形式はエラーになる', () => {
    expect(validateImageFile(fileOf('image/svg+xml'))).toBe(
      'JPG・PNG・WebP・GIF形式のみ対応しています',
    );
  });

  test('ちょうど上限のサイズは受け付ける', () => {
    expect(validateImageFile(fileOf('image/png', MAX_IMAGE_SIZE_BYTES))).toBeNull();
  });

  test('上限を1バイトでも超えるとエラーになる', () => {
    expect(validateImageFile(fileOf('image/png', MAX_IMAGE_SIZE_BYTES + 1))).toBe(
      'ファイルサイズは10MB以下にしてください',
    );
  });
});

describe('safeImageExt', () => {
  test('ファイル名ではなく MIME タイプから拡張子を決める', () => {
    const file = new File([new Uint8Array(1)], 'photo.exe', { type: 'image/webp' });

    expect(safeImageExt(file)).toBe('webp');
  });

  test('image/jpeg は jpg になる', () => {
    expect(safeImageExt(fileOf('image/jpeg'))).toBe('jpg');
  });
});
