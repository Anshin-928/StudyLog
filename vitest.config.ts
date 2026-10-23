import { defineConfig } from 'vitest/config';

// 日付の境界（今日・昨日など）がマシンのタイムゾーンで変わらないよう、e2e と同じく日本時間に固定する。
// テストを実行するワーカーはこの設定ファイルを読んだあとに起動するので、ここで設定すれば全テストに効く
process.env.TZ = 'Asia/Tokyo';

export default defineConfig({
  // .env（本番の Supabase の接続先）を読み込まない。単体テストはどこにも通信しない
  envDir: false,
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Supabase のクライアントを作るためだけの値。通信はしないので、実在しない接続先でよい
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'unit-test-anon-key',
    },
    // テストごとにモックとグローバルの差し替えを元に戻し、テスト同士が影響し合わないようにする
    restoreMocks: true,
    unstubGlobals: true,
  },
});
