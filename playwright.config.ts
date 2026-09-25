import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e.local', quiet: true });

// 普段の `npm run dev`(5173, 本番Supabase接続) と衝突・誤って再利用しないよう専用ポートを使う
const E2E_PORT = 5174;
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // リトライで不安定なテストを隠さない。失敗したら1回目で原因を調べる
  retries: 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    // 実行するマシンのタイムゾーン（CIはUTC）で日付の境界が変わり結果が揺れないよう固定する
    timezoneId: 'Asia/Tokyo',
    locale: 'ja-JP',
    trace: 'retain-on-failure',
    // 画面遷移を目で追いたいとき用。E2E_SLOW_MO=500 のように操作ごとの待ち時間(ms)を指定する
    launchOptions: { slowMo: Number(process.env.E2E_SLOW_MO ?? 0) },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: baseURL,
    // 既存サーバーを使い回さず、必ず --mode e2e で起動したサーバーに対してテストする
    reuseExistingServer: false,
    timeout: 30_000,
    // Viteは既存の環境変数を .env ファイルより優先する。global-setup で検証した接続先をアプリに確実に渡す
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
  },
});
