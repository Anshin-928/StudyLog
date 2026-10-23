// カテゴリ入力欄の候補リスト
import { describe, expect, test } from 'vitest';
import { buildCategoryOptions, NEW_CATEGORY_PREFIX } from './categoryUtils';

const base = [
  { id: 'c1', name: '数学' },
  { id: 'c2', name: '英語' },
];

describe('buildCategoryOptions', () => {
  test('既存のカテゴリにない名前なら、末尾に「新規作成」の候補を足す', () => {
    const options = buildCategoryOptions('物理', base);

    expect(options).toEqual([
      ...base,
      { id: `${NEW_CATEGORY_PREFIX}物理`, name: '物理', isNew: true },
    ]);
  });

  test('既存のカテゴリと同じ名前なら、候補を足さない', () => {
    expect(buildCategoryOptions('数学', base)).toEqual(base);
  });

  test('前後の空白を除いて比べる', () => {
    expect(buildCategoryOptions('  数学  ', base)).toEqual(base);
  });

  test('空白だけの入力では候補を足さない', () => {
    expect(buildCategoryOptions('   ', base)).toEqual(base);
  });
});
