// src/lib/reportUtils.ts
// Report画面で使う型定義・ユーティリティ・データ加工関数

// ==========================================
// 型定義
// ==========================================
export type Period = '7d' | '30d' | '1y';

export interface LogEntry {
  id: string;
  materialId: string | null;
  materialName: string | null;
  materialImage: string | null;
  colorCode: string | null;
  studyDatetime: string;
  durationMinutes: number | null;
}

export interface PieItem {
  key: string;
  name: string;
  value: number;
  image: string | null;
  color: string;
}

export type StackedBarItem = Record<string, string | number>;

export const PERIOD_LABELS: Record<Period, string> = {
  '7d': '直近7日間',
  '30d': '直近30日間',
  '1y': '直近1年間',
};

// ==========================================
// 時間フォーマット
// ==========================================
export function formatDuration(mins: number): string {
  if (mins <= 0) return '0分';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

export function formatDurationHoursOnly(mins: number): string {
  const h = Math.floor(mins / 60);
  return `${h}時間`;
}

export function formatDurationShort(mins: number): string {
  if (mins <= 0) return '0';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

// ==========================================
// 日付ユーティリティ
// ==========================================
export function todayStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function toLocalDate(isoStr: string): string {
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function shortMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

export function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getPeriodStart(period: Period): string {
  if (period === '7d') return daysAgoStr(6);
  if (period === '30d') return daysAgoStr(29);
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// ==========================================
// 期間オフセット（ダイアログ用）
// ==========================================
export function getPeriodInfo(period: Period, offset: number): {
  startDate: string;
  endDate: string;
  dates: string[];
} {
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const startDaysAgo = offset * days + days - 1;
    const endDaysAgo = offset * days;
    const startDate = daysAgoStr(startDaysAgo);
    const endDate = daysAgoStr(endDaysAgo);
    const dates: string[] = [];
    for (let i = startDaysAgo; i >= endDaysAgo; i--) dates.push(daysAgoStr(i));
    return { startDate, endDate, dates };
  }

  // 1y: offset単位=12ヶ月
  const dEnd = new Date();
  dEnd.setDate(1);
  dEnd.setMonth(dEnd.getMonth() - offset * 12);
  const endYm = `${dEnd.getFullYear()}-${String(dEnd.getMonth() + 1).padStart(2, '0')}`;
  const dStart = new Date(dEnd);
  dStart.setMonth(dStart.getMonth() - 11);
  const startYm = `${dStart.getFullYear()}-${String(dStart.getMonth() + 1).padStart(2, '0')}`;
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(dEnd);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return { startDate: startYm, endDate: endYm, dates: months };
}

export function formatPeriodRange(start: string, end: string, period: Period): string {
  if (period === '1y') {
    const [sy, sm] = start.split('-');
    const [ey, em] = end.split('-');
    return `${sy}年${parseInt(sm)}月 〜 ${ey}年${parseInt(em)}月`;
  }
  const [sy, sm, sd] = start.split('-');
  const [ey, em, ed] = end.split('-');
  return `${sy}年${parseInt(sm)}月${parseInt(sd)}日 〜 ${ey}年${parseInt(em)}月${parseInt(ed)}日`;
}

// ==========================================
// 学習推移ビュー用（日/週/月 タブ）
// ==========================================
export type TrendViewMode = 'day' | 'week' | 'month';

export const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'];

/** YYYY-MM-DD を受け取り曜日文字（月火水...）を返す */
export function getDow(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DOW_JP[new Date(y, m - 1, d).getDay()];
}

/** 週の月曜日を返す */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function dateObjToStr(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** weekモードのとき、ある月曜日の週の日曜日のdateStrを返す */
export function getWeekSunday(mondayStr: string): string {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const sun = new Date(y, m - 1, d + 6);
  return dateObjToStr(sun);
}

export function getTrendPeriodInfo(mode: TrendViewMode, offset: number): {
  startDate: string;
  endDate: string;    // day/week: 最後の日付 (month: 最終YM)
  endDateFull: string; // 表示用: week=最終日曜, それ以外=endDate
  dates: string[];
} {
  if (mode === 'day') {
    const off = offset * 7;
    const dates: string[] = [];
    for (let i = 6 + off; i >= off; i--) dates.push(daysAgoStr(i));
    return { startDate: dates[0], endDate: dates[6], endDateFull: dates[6], dates };
  }

  if (mode === 'week') {
    const currentMonday = getWeekMonday(new Date());
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const monday = new Date(currentMonday);
      monday.setDate(monday.getDate() - (i + offset * 7) * 7);
      dates.push(dateObjToStr(monday));
    }
    const endDateFull = getWeekSunday(dates[6]);
    return { startDate: dates[0], endDate: dates[6], endDateFull, dates };
  }

  // month: 7ヶ月
  const dEnd = new Date();
  dEnd.setDate(1);
  dEnd.setMonth(dEnd.getMonth() - offset * 7);
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dEnd);
    d.setMonth(d.getMonth() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return { startDate: dates[0], endDate: dates[6], endDateFull: dates[6], dates };
}

export function formatTrendPeriodRange(startDate: string, endDateFull: string, mode: TrendViewMode): string {
  if (mode === 'month') {
    const [sy, sm] = startDate.split('-');
    const [ey, em] = endDateFull.split('-');
    return `${sy}年${parseInt(sm)}月 〜 ${ey}年${parseInt(em)}月`;
  }
  const [sy, sm, sd] = startDate.split('-');
  const [ey, em, ed] = endDateFull.split('-');
  return `${sy}年${parseInt(sm)}月${parseInt(sd)}日 〜 ${ey}年${parseInt(em)}月${parseInt(ed)}日`;
}

// ==========================================
// データ加工
// ==========================================
export function buildPieData(logs: LogEntry[], chartColors: string[]): PieItem[] {
  const materialMap = new Map<string, { name: string; value: number; image: string | null }>();

  for (const l of logs) {
    if ((l.durationMinutes ?? 0) <= 0) continue;
    const key = l.materialId ?? '__none__';
    const name = l.materialName ?? '教材なし';
    if (!materialMap.has(key)) {
      materialMap.set(key, { name, value: 0, image: l.materialImage });
    }
    materialMap.get(key)!.value += l.durationMinutes ?? 0;
  }

  return Array.from(materialMap.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({ ...item, color: chartColors[i % chartColors.length] }));
}

export function buildStackedBarData(logs: LogEntry[], period: Period): StackedBarItem[] {
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const result: StackedBarItem[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = daysAgoStr(i);
      const dayLogs = logs.filter(l => toLocalDate(l.studyDatetime) === dateStr);
      const item: StackedBarItem = { label: shortDate(dateStr), fullLabel: shortDate(dateStr) };
      for (const l of dayLogs) {
        if ((l.durationMinutes ?? 0) <= 0) continue;
        const key = l.materialId ?? '__none__';
        item[key] = ((item[key] as number) || 0) + (l.durationMinutes ?? 0);
      }
      result.push(item);
    }
    return result;
  }

  const result: StackedBarItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => toLocalDate(l.studyDatetime).slice(0, 7) === ym);
    const item: StackedBarItem = {
      label: `${parseInt(ym.split('-')[1])}月`,
      fullLabel: shortMonth(ym),
    };
    for (const l of monthLogs) {
      if ((l.durationMinutes ?? 0) <= 0) continue;
      const key = l.materialId ?? '__none__';
      item[key] = ((item[key] as number) || 0) + (l.durationMinutes ?? 0);
    }
    result.push(item);
  }
  return result;
}