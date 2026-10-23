// 画面のファイルを読み込めなかったときのエラーの判定
import { describe, expect, test } from 'vitest';
import { isChunkLoadError } from './lazyWithReload';

describe('isChunkLoadError', () => {
  test.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://example.com/assets/a.js'],
    ['Firefox', 'error loading dynamically imported module: https://example.com/assets/a.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Safari（HTML が返った）', "'text/html' is not a valid JavaScript MIME type."],
    ['Vite の CSS', 'Unable to preload CSS for /assets/a.css'],
  ])('%s の読み込み失敗は true', (_, message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  test('モジュールの実行中に投げられた例外は false', () => {
    expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
  });

  test('Error 以外の値は false', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });
});
