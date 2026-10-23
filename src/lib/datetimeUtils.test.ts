// 日時・学習時間の表示フォーマット（タイムゾーンは vitest.config.ts で日本時間に固定している）
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  combineDatetime,
  daysAgo,
  extractDate,
  extractTime,
  formatDateLabel,
  formatDatetime,
  formatDuration,
  formatExactTime,
  nowDatetimeLocal,
} from './datetimeUtils';

describe('formatDuration', () => {
  test('60分未満は「Y分」になる', () => {
    expect(formatDuration(45)).toBe('45分');
  });

  test('ちょうど X 時間なら分を付けない', () => {
    expect(formatDuration(120)).toBe('2時間');
  });

  test('時間と分の両方があれば「X時間Y分」になる', () => {
    expect(formatDuration(135)).toBe('2時間15分');
  });

  test.each([0, -5, null, undefined])('%s は空文字になる', (mins) => {
    expect(formatDuration(mins)).toBe('');
  });
});

describe('formatDatetime', () => {
  test('日本時間の「YYYY年M月D日 HH:MM」になる', () => {
    expect(formatDatetime('2026-01-05T00:07:00Z')).toBe('2026年1月5日 09:07');
  });

  test('日時として読めない文字列は「---」になる', () => {
    expect(formatDatetime('not-a-date')).toBe('---');
  });
});

describe('formatExactTime', () => {
  test('日本時間の「M月D日 X曜日 H:MM」になる', () => {
    // 2026-10-24 は土曜日
    expect(formatExactTime('2026-10-24T00:05:00Z')).toBe('10月24日 土曜日 9:05');
  });
});

describe('formatDateLabel', () => {
  test('YYYY-MM-DD が「M月D日（曜）」になる', () => {
    expect(formatDateLabel('2026-10-25')).toBe('10月25日（日）');
  });

  test('日付として読めない文字列はそのまま返す', () => {
    expect(formatDateLabel('invalid')).toBe('invalid');
  });
});

describe('datetime-local の文字列の分解・結合', () => {
  test('日付部分を取り出せる', () => {
    expect(extractDate('2026-10-24T13:45')).toBe('2026-10-24');
  });

  test('時刻部分を取り出せる', () => {
    expect(extractTime('2026-10-24T13:45')).toBe('13:45');
  });

  test('日付と時刻を結合できる', () => {
    expect(combineDatetime('2026-10-24', '13:45')).toBe('2026-10-24T13:45');
  });
});

describe('現在時刻を使う関数', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('nowDatetimeLocal は UTC ではなく日本時間の日時を返す', () => {
    // UTC では 10/23 だが、日本時間では 10/24 の朝
    vi.setSystemTime(new Date('2026-10-23T23:30:00Z'));

    expect(nowDatetimeLocal()).toBe('2026-10-24T08:30');
  });

  test('daysAgo(0) は日本時間の今日になる', () => {
    vi.setSystemTime(new Date('2026-10-23T23:30:00Z'));

    expect(daysAgo(0)).toBe('2026-10-24');
  });

  test('daysAgo は月をまたいで数えられる', () => {
    vi.setSystemTime(new Date('2026-03-01T03:00:00Z'));

    expect(daysAgo(1)).toBe('2026-02-28');
  });
});
