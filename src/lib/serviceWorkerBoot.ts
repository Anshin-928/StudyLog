// src/lib/serviceWorkerBoot.ts
// アプリ（Supabase の API を呼ぶ画面）を起動する前に、Service Worker とキャッシュを安全な状態にする。
//
// 以前の Service Worker は Supabase の API 応答を 'supabase-cache' に保存していた。キャッシュは URL だけで引かれ、
// ログアウト後も個人データが端末に残り、通信断のときには別のユーザーに前のユーザーの応答が返っていた（vite.config.ts 参照）。
// そこで起動時に次を済ませてから画面を起動する。どれかが失敗・時間切れになったら、画面を起動せずに再試行を促す。
//   1. 'supabase-cache' を削除する
//   2. 画面を制御している Service Worker があれば、最新版への更新を確認し、新しい版があれば切り替わるまで待つ
//   3. 待っている間に作られた可能性に備えて、もう一度 'supabase-cache' を削除する

const LEGACY_CACHE_NAMES = ['supabase-cache'];
export const BOOT_TIMEOUT_MS = 10_000;
const STEP_TIMEOUT_MS = 5_000;
// 起動の確認が終わった時刻を記録する（E2E や開発者ツールで、API の呼び出しがこれより後かを確かめるため）
export const BOOT_READY_MARK = 'studylog:boot-ready';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} が ${ms}ms 以内に終わりませんでした`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

async function deleteLegacyCaches(): Promise<void> {
  if (!('caches' in window)) return;
  for (const name of LEGACY_CACHE_NAMES) {
    await caches.delete(name);
    // 削除を確かめる（消えていなければ失敗として扱い、画面を起動しない）
    if ((await caches.keys()).includes(name)) throw new Error(`${name} を削除できませんでした`);
  }
}

// 画面を制御している Service Worker を最新版にする。新しい版は autoUpdate（skipWaiting + clientsClaim）で
// すぐに有効になるので、controllerchange を待てば切り替わる
async function ensureLatestServiceWorker(): Promise<void> {
  const sw = navigator.serviceWorker;
  // 制御されていないページの通信は Service Worker を通らないので、キャッシュされない
  if (!sw?.controller) return;

  const registration = await sw.getRegistration();
  if (!registration) return;

  const switched = new Promise<void>(resolve => sw.addEventListener('controllerchange', () => resolve(), { once: true }));
  await withTimeout(registration.update(), STEP_TIMEOUT_MS, 'Service Worker の更新確認');
  if (registration.installing || registration.waiting) {
    await withTimeout(switched, STEP_TIMEOUT_MS, '新しい Service Worker への切り替え');
  }
}

async function prepare(): Promise<void> {
  await deleteLegacyCaches();
  await ensureLatestServiceWorker();
  await deleteLegacyCaches();
}

// 実行中の準備。同時に呼ばれたら（開発時の StrictMode では effect が2回走る）同じ処理を共有する
let inFlight: Promise<void> | null = null;

export function prepareServiceWorker(): Promise<void> {
  inFlight ??= withTimeout(prepare(), BOOT_TIMEOUT_MS, '起動前の準備')
    .then(() => { performance.mark(BOOT_READY_MARK); })
    .finally(() => { inFlight = null; });
  return inFlight;
}
