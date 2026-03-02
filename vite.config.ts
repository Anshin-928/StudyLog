// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,

    proxy: {
      // '/api/rakuten' という宛先に来たリクエストを、楽天のサーバーに横流しする
      '/api/rakuten': {
        target: 'https://openapi.rakuten.co.jp', // 新APIのドメイン
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rakuten/, ''),
        headers: {
          // 🌟 ここが最大のポイント！登録したテキトーなURLを差出人として偽装する！
          'Referer': 'https://app.studylog.jp', // ※VercelのURLを登録したなら、そのURLにする
          'Origin': 'https://app.studylog.jp'
        }
      }
    }
  }
})