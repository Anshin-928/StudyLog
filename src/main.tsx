import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 以前の Service Worker が保存した 'supabase-cache' は、新しい Service Worker が削除する（public/sw-legacy-cache-cleanup.js）。
// 古い版が制御している端末では古い index.html とバンドルが返り、このファイル自体が動かないので、画面側では削除しない
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
