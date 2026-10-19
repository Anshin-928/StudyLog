// public/sw-legacy-cache-cleanup.js
// Service Worker に読み込ませる（vite.config.ts の workbox.importScripts）。
// 以前の Service Worker は Supabase の API 応答を 'supabase-cache' に保存していた。キャッシュは URL だけで引かれ、
// ログアウト後も個人データが端末に残り、通信断のときには別のユーザーに前のユーザーの応答が返っていた。
// 新しい Service Worker が有効になった時点で削除する。有効になった Service Worker は API 応答を保存しないため、
// 古い版が制御していたタブも clientsClaim で新しい版に切り替わり、以後このキャッシュが新しく作られることはない。
// 画面側（src/main.tsx）では削除しない。古い版が制御している端末では新しい画面のコードが動かず、削除はここでしかできない
//
// ただし切り替わった時点で古い版が処理中だった通信は、削除した後に応答を保存してキャッシュを作り直すことがある。
// activate は1回しか走らないので、以後のページの読み込み（画面遷移の通信）のたびにも残っていないか確かめて削除する。
// 画像や API などすべての通信で確かめると、キャッシュがなくなった後も通信のたびに余計な処理が走るので、画面遷移に限る。
// 削除に失敗した場合も、次のページの読み込みで再び試みる

const LEGACY_CACHE_NAMES = ['supabase-cache'];

async function deleteLegacyCaches() {
  for (const name of LEGACY_CACHE_NAMES) {
    if (!(await caches.has(name))) continue;
    await caches.delete(name);
    // 削除を確かめる（消えていなければ失敗として記録し、次のページの読み込みで再び試みる）
    if (await caches.has(name)) throw new Error(`${name} を削除できませんでした`);
  }
}

// 実行中の削除。同時に呼ばれたら同じ処理を共有する
let inFlight = null;

function sweepLegacyCaches() {
  // このファイルはトランスパイルされずに読み込まれるので、古いブラウザでも解釈できる構文に限る（??= などは使わない）。
  // 解釈できないとインストールに失敗し、API 応答を保存する古い版が制御を続ける
  if (!inFlight) {
    inFlight = deleteLegacyCaches()
      .catch((error) => { console.error('[sw-legacy-cache-cleanup]', error); })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

self.addEventListener('activate', (event) => {
  event.waitUntil(sweepLegacyCaches());
});

// respondWith は呼ばない（応答は Workbox の経路やネットワークに任せ、ここでは削除だけを行う）
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.waitUntil(sweepLegacyCaches());
});
