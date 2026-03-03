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