// 記録画面のセルに表示する学習量のラベル
import { describe, expect, test } from 'vitest';
import type { PagesData } from '../../../types/record';
import { getPagesDisplayValue } from './PagesDialog';

function pages(overrides: Partial<PagesData>): PagesData {
  return { mode: 'total', total: '', rangeStart: '', rangeEnd: '', ...overrides };
}

describe('getPagesDisplayValue', () => {
  test('合計を入力したら「N 単位」になる', () => {
    expect(getPagesDisplayValue(pages({ total: '12' }), 'ページ')).toBe('12 ページ');
  });

  test('範囲を入力したら、範囲と差分の量を表示する', () => {
    const value = pages({ mode: 'range', total: '20', rangeStart: '10', rangeEnd: '30' });

    expect(getPagesDisplayValue(value, '問')).toBe('10 〜 30（20 問）');
  });

  test('未入力なら undefined', () => {
    expect(getPagesDisplayValue(pages({}), 'ページ')).toBeUndefined();
  });

  test('合計が 0 なら undefined', () => {
    expect(getPagesDisplayValue(pages({ total: '0' }), 'ページ')).toBeUndefined();
  });
});
