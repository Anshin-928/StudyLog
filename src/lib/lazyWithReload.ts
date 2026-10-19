// src/lib/lazyWithReload.ts
// 画面のファイル（コード分割したチャンク）を読み込めなかったら、ページを1回だけ自動で読み込み直す。
//
// 新しい版を公開すると、新しい Service Worker が有効になった時点で古いビルドのチャンクを precache から消す。
// 開いたままの古い画面がそのあと別の画面に移ると、古いチャンクを取りに行き、Vercel は存在しないパスに index.html を返すので
// 読み込みに失敗する。読み込み直せば新しいビルドの index.html とチャンクで動くので、ユーザーに操作させずに読み込み直す。
// - 読み込み直しても失敗する場合（通信断など）に繰り返さないよう、自動で読み込み直した結果のページでは、もう読み込み直さずに
//   エラーを投げる（ルートの errorElement が再読み込みボタンを出す）。読み込み直しにかかった時間には左右されない
// - 読み込みに失敗したときだけ読み込み直す。モジュールの実行中に投げられた例外（コードの不具合）は、読み込み直しても直らないので
//   そのまま投げる
// - 自動で読み込み直した後に画面のファイルを読み込めたら、新しい版で動いているので、次の公開のときにもまた読み込み直せるようにする
// - 画面の切り替え以外の動的 import には使わない。操作の途中で読み込み直すと入力中の内容が失われるため

import { lazy } from 'react';
import type { ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'studylog:chunk-reload';

// このページが、チャンクを読み込めずに自動で読み込み直した結果で、まだ画面のファイルを読み込めていないかどうか。
// 読み込んだ時点で印を消し、利用者が自分で再読み込みしたときに引き継がないようにする
let loadedByChunkReload = (() => {
  try {
    const marked = sessionStorage.getItem(CHUNK_RELOAD_KEY) !== null;
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return marked;
  } catch {
    return false;
  }
})();

let reloading = false;

// ブラウザごとの、動的 import でファイルを取得・読み込みできなかったときのメッセージ（Chrome / Firefox / Safari）、
// Safari で JavaScript 以外（index.html など）が返ったときのメッセージと、Vite が依存する CSS を読み込めなかったときのメッセージ。
// E2E は Chromium でしか確かめていないので、ほかのブラウザで当てはまらない文言が見つかったらここに足す
const CHUNK_LOAD_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_LOAD_ERROR.test(error.message);
}

// 読み込み直すことにしたら（すでに読み込み直している途中も含めて）true を返す
function reloadForChunkError(): boolean {
  if (reloading) return true;
  if (loadedByChunkReload) return false;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  } catch {
    // 記録できないと繰り返し読み込み直すおそれがあるので、読み込み直さない
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

export function lazyWithReload<T extends ComponentType>(factory: () => Promise<{ default: T }>) {
  return lazy(() => factory().then((module) => {
    loadedByChunkReload = false;
    return module;
  }, (error: unknown) => {
    console.error('[lazyWithReload] 画面のファイルを読み込めませんでした:', error);
    if (!isChunkLoadError(error) || !reloadForChunkError()) throw error;
    // 読み込み直すまで、読み込み中の表示のままにする
    return new Promise<{ default: T }>(() => {});
  }));
}
