import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 新しいService Workerは待機させずにすぐ有効にする（再読み込みすれば必ず新版になる）。
      // 'prompt' にすると、旧版のタブをすべて閉じるまで新版が有効にならず、再読み込みしても旧版が表示され続ける
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon_dark.svg'],
      manifest: {
        name: 'StudyLog',
        short_name: 'StudyLog',
        description: '学習記録アプリ',
        theme_color: '#F0F4F9',
        background_color: '#F0F4F9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Supabase の API 応答はキャッシュしない（runtimeCaching を設定しない）。
        // キャッシュは URL だけで引かれ、誰のトークンで取得したかを区別しないため、ログアウト後も個人データが端末に残り、
        // 通信断のときには別のユーザーに前のユーザーの応答が返る。以前のキャッシュは src/lib/serviceWorkerBoot.ts で消す
      },
    }),
  ],
  server: {
    allowedHosts: true,

    proxy: {
      '/api/rakuten': {
        target: 'https://openapi.rakuten.co.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rakuten/, '/services/api/BooksBook/Search/20170404'),
        headers: {
          'Referer': 'https://studylog-seven.vercel.app',
          'Origin': 'https://studylog-seven.vercel.app',
        }
      }
    }
  }
})