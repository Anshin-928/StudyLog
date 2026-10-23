// レポート画面の期間計算・集計（タイムゾーンは vitest.config.ts で日本時間に固定している）
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildPieData,
  buildStackedBarData,
  formatDuration,
  formatDurationShort,
  formatPeriodRange,
  formatTrendPeriodRange,
  getDow,
  getPeriodInfo,
  getPeriodStart,
  getTrendPeriodInfo,
  getWeekSunday,
  shortDate,
  shortMonth,
  thisMonthStart,
  toLocalDate,
  todayStr,
  type LogEntry,
} from './reportUtils';

function log(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: 'log',
    materialId: 'm1',
    materialName: '数学',
    materialImage: null,
    colorCode: null,
    studyDatetime: '2026-10-24T10:00:00+09:00',
    durationMinutes: 30,
    ...overrides,
  };
}

/** 日本時間の日時に時計を合わせる */
function setNow(jst: string) {
  vi.setSystemTime(new Date(`${jst}+09:00`));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('時間のフォーマット', () => {
  test('formatDuration は 0 分を「0分」と表示する', () => {
    expect(formatDuration(0)).toBe('0分');
  });

  test('formatDurationShort は時間と分を組み合わせて表示する', () => {
    expect(formatDurationShort(75)).toBe('1時間15分');
  });
});

describe('日付のユーティリティ', () => {
  test('todayStr は日本時間の今日を返す', () => {
    setNow('2026-10-24T00:30:00');

    expect(todayStr()).toBe('2026-10-24');
  });

  test('toLocalDate は UTC の日時を日本時間の日付にする', () => {
    expect(toLocalDate('2026-10-23T15:30:00Z')).toBe('2026-10-24');
  });

  test('thisMonthStart は今月の1日を返す', () => {
    setNow('2026-10-24T12:00:00');

    expect(thisMonthStart()).toBe('2026-10-01');
  });

  test('shortDate は「M/D」になる', () => {
    expect(shortDate('2026-03-05')).toBe('3/5');
  });

  test('shortMonth は「YYYY年M月」になる', () => {
    expect(shortMonth('2026-03')).toBe('2026年3月');
  });

  test('getDow は曜日の文字を返す', () => {
    expect(getDow('2026-10-24')).toBe('土');
  });

  test('getWeekSunday は月曜日から6日後の日曜日を返す', () => {
    expect(getWeekSunday('2026-10-26')).toBe('2026-11-01');
  });
});

describe('getPeriodStart', () => {
  test('7d は今日を含めて7日間の初日を返す', () => {
    setNow('2026-10-24T12:00:00');

    expect(getPeriodStart('7d')).toBe('2026-10-18');
  });

  test('30d は今日を含めて30日間の初日を返す', () => {
    setNow('2026-10-24T12:00:00');

    expect(getPeriodStart('30d')).toBe('2026-09-25');
  });

  test('1y は今月を含めて12か月間の、最初の月の1日を返す', () => {
    setNow('2026-10-24T12:00:00');

    expect(getPeriodStart('1y')).toBe('2025-11-01');
  });

  test('1y は月末の日でも、最初の月の1日を返す', () => {
    // 11か月前の 2025-04 には31日がない
    setNow('2026-03-31T12:00:00');

    expect(getPeriodStart('1y')).toBe('2025-04-01');
  });
});

describe('getPeriodInfo', () => {
  test('7d の offset 0 は今日までの7日間', () => {
    setNow('2026-10-24T12:00:00');

    const info = getPeriodInfo('7d', 0);

    expect(info.dates).toEqual([
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
  });

  test('7d の offset 1 は、その前の7日間', () => {
    setNow('2026-10-24T12:00:00');

    const info = getPeriodInfo('7d', 1);

    expect([info.startDate, info.endDate]).toEqual(['2026-10-11', '2026-10-17']);
  });

  test('1y は今月までの12か月を年月で返す', () => {
    setNow('2026-10-24T12:00:00');

    const info = getPeriodInfo('1y', 0);

    expect(info.dates).toHaveLength(12);
    expect([info.startDate, info.endDate]).toEqual(['2025-11', '2026-10']);
  });

  test('1y は月末の日でも12か月が重複なく並ぶ', () => {
    setNow('2026-03-31T12:00:00');

    const info = getPeriodInfo('1y', 0);

    expect(new Set(info.dates).size).toBe(12);
    expect([info.startDate, info.endDate]).toEqual(['2025-04', '2026-03']);
  });
});

describe('getTrendPeriodInfo', () => {
  test('day は今日までの7日間', () => {
    setNow('2026-10-24T12:00:00');

    const info = getTrendPeriodInfo('day', 0);

    expect([info.startDate, info.endDateFull]).toEqual(['2026-10-18', '2026-10-24']);
  });

  test('week は今週を含む7週の月曜日を並べ、最終日は今週の日曜日', () => {
    // 2026-10-24 は土曜日。今週の月曜日は 10/19
    setNow('2026-10-24T12:00:00');

    const info = getTrendPeriodInfo('week', 0);

    expect(info.dates[0]).toBe('2026-09-07');
    expect(info.endDate).toBe('2026-10-19');
    expect(info.endDateFull).toBe('2026-10-25');
  });

  test('week は日曜日を、その前の月曜日から始まる週として扱う', () => {
    setNow('2026-10-25T12:00:00');

    expect(getTrendPeriodInfo('week', 0).endDate).toBe('2026-10-19');
  });

  test('month は今月までの7か月', () => {
    setNow('2026-10-24T12:00:00');

    const info = getTrendPeriodInfo('month', 0);

    expect([info.startDate, info.endDate]).toEqual(['2026-04', '2026-10']);
  });
});

describe('期間の表示', () => {
  test('formatPeriodRange は日付の範囲を「YYYY年M月D日 〜 YYYY年M月D日」にする', () => {
    expect(formatPeriodRange('2026-10-18', '2026-10-24', '7d')).toBe(
      '2026年10月18日 〜 2026年10月24日',
    );
  });

  test('formatPeriodRange は 1y を年月の範囲にする', () => {
    expect(formatPeriodRange('2025-11', '2026-10', '1y')).toBe('2025年11月 〜 2026年10月');
  });

  test('formatTrendPeriodRange は month を年月の範囲にする', () => {
    expect(formatTrendPeriodRange('2026-04', '2026-10', 'month')).toBe('2026年4月 〜 2026年10月');
  });
});

describe('buildPieData', () => {
  const colors = ['#red', '#blue'];

  test('教材ごとに学習時間を合計し、多い順に並べる', () => {
    const logs = [
      log({ materialId: 'm1', materialName: '数学', durationMinutes: 30 }),
      log({ materialId: 'm2', materialName: '英語', durationMinutes: 50 }),
      log({ materialId: 'm1', materialName: '数学', durationMinutes: 40 }),
    ];

    const pie = buildPieData(logs, colors);

    expect(pie.map((p) => [p.name, p.value])).toEqual([
      ['数学', 70],
      ['英語', 50],
    ]);
  });

  test('教材のない記録は「教材なし」としてまとめる', () => {
    const pie = buildPieData([log({ materialId: null, materialName: null })], colors);

    expect(pie[0].name).toBe('教材なし');
  });

  test('学習時間が 0 や未入力の記録は数えない', () => {
    const logs = [log({ durationMinutes: 0 }), log({ durationMinutes: null })];

    expect(buildPieData(logs, colors)).toEqual([]);
  });

  test('色は多い順に割り当て、足りなければ最初の色から繰り返す', () => {
    const logs = [
      log({ materialId: 'a', durationMinutes: 30 }),
      log({ materialId: 'b', durationMinutes: 20 }),
      log({ materialId: 'c', durationMinutes: 10 }),
    ];

    expect(buildPieData(logs, colors).map((p) => p.color)).toEqual(['#red', '#blue', '#red']);
  });
});

describe('buildStackedBarData', () => {
  test('7d は日ごとに教材別の学習時間を合計する', () => {
    setNow('2026-10-24T12:00:00');
    const logs = [
      log({ materialId: 'm1', studyDatetime: '2026-10-24T08:00:00+09:00', durationMinutes: 30 }),
      log({ materialId: 'm1', studyDatetime: '2026-10-24T20:00:00+09:00', durationMinutes: 15 }),
      log({ materialId: 'm2', studyDatetime: '2026-10-23T20:00:00+09:00', durationMinutes: 10 }),
    ];

    const bars = buildStackedBarData(logs, '7d');

    expect(bars).toHaveLength(7);
    expect(bars[6]).toEqual({ label: '10/24', fullLabel: '10/24', m1: 45 });
    expect(bars[5]).toEqual({ label: '10/23', fullLabel: '10/23', m2: 10 });
  });

  test('1y は月ごとに合計し、今月までの12か月を並べる', () => {
    setNow('2026-10-24T12:00:00');
    const logs = [
      log({ materialId: 'm1', studyDatetime: '2025-11-15T10:00:00+09:00', durationMinutes: 20 }),
    ];

    const bars = buildStackedBarData(logs, '1y');

    expect(bars.map((b) => b.label)).toEqual([
      '11月',
      '12月',
      '1月',
      '2月',
      '3月',
      '4月',
      '5月',
      '6月',
      '7月',
      '8月',
      '9月',
      '10月',
    ]);
    expect(bars[0]).toEqual({ label: '11月', fullLabel: '2025年11月', m1: 20 });
  });

  test('教材のない記録は __none__ のキーで合計する', () => {
    setNow('2026-10-24T12:00:00');

    const bars = buildStackedBarData([log({ materialId: null })], '7d');

    expect(bars[6].__none__).toBe(30);
  });
});
