// 連続学習日数（ストリーク）の計算（タイムゾーンは vitest.config.ts で日本時間に固定している）
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { calcStreakFromDates } from './streak';

describe('calcStreakFromDates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 日本時間 2026-10-24 12:00
    vi.setSystemTime(new Date('2026-10-24T03:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('記録がなければ 0 日', () => {
    expect(calcStreakFromDates([])).toBe(0);
  });

  test('今日まで3日続いていれば 3 日', () => {
    const dates = [
      '2026-10-22T10:00:00+09:00',
      '2026-10-23T10:00:00+09:00',
      '2026-10-24T10:00:00+09:00',
    ];

    expect(calcStreakFromDates(dates)).toBe(3);
  });

  test('今日はまだ記録がなくても、昨日まで続いていれば途切れない', () => {
    const dates = ['2026-10-22T10:00:00+09:00', '2026-10-23T10:00:00+09:00'];

    expect(calcStreakFromDates(dates)).toBe(2);
  });

  test('一昨日が最後の記録なら 0 日', () => {
    expect(calcStreakFromDates(['2026-10-22T10:00:00+09:00'])).toBe(0);
  });

  test('間に空いた日があれば、そこで数えるのをやめる', () => {
    const dates = [
      '2026-10-20T10:00:00+09:00',
      '2026-10-23T10:00:00+09:00',
      '2026-10-24T10:00:00+09:00',
    ];

    expect(calcStreakFromDates(dates)).toBe(2);
  });

  test('同じ日に複数の記録があっても 1 日として数える', () => {
    const dates = ['2026-10-24T08:00:00+09:00', '2026-10-24T21:00:00+09:00'];

    expect(calcStreakFromDates(dates)).toBe(1);
  });

  test('日本時間の深夜の記録は、UTC の日付ではなく日本時間の日付で数える', () => {
    // UTC では 10/22 15:30 だが、日本時間では 10/23 0:30（昨日）
    expect(calcStreakFromDates(['2026-10-22T15:30:00Z'])).toBe(1);
  });
});
