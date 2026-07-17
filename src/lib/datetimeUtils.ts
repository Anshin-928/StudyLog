// src/lib/datetimeUtils.ts
// 日時・学習時間の表示フォーマット共通ユーティリティ

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 分を「X時間Y分」に整形。0以下・null・undefined は空文字を返す。
 * 「---」「0分」などのフォールバックが必要な場合は呼び出し側で `formatDuration(x) || '---'` とする。
 */
export function formatDuration(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

/** ISO文字列を「YYYY年M月D日 HH:MM」に整形（不正値は '---'） */
export function formatDatetime(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '---';
  const mo = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}年${mo}月${dd}日 ${hh}:${mm}`;
}

/** ISO文字列を「M月D日 X曜日 H:MM」に整形（タイムライン表示用） */
export function formatExactTime(isoStr: string): string {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayStr = DOW_JP[d.getDay()];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${dayStr}曜日 ${h}:${m}`;
}

/** 現在時刻をローカルタイムの datetime-local 形式（YYYY-MM-DDTHH:MM）で返す */
export function nowDatetimeLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function extractDate(dt: string): string {
  return dt.slice(0, 10);
}

export function extractTime(dt: string): string {
  return dt.slice(11, 16);
}

export function combineDatetime(date: string, time: string): string {
  return `${date}T${time}`;
}

/** n日前の日付をローカルタイムの YYYY-MM-DD で返す */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

/** YYYY-MM-DD を「M月D日（曜）」に整形 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW_JP[d.getDay()]}）`;
}
