/// <reference types="vite/client" />

// カスタム環境変数の型定義
interface ImportMetaEnv {
  readonly VITE_RAKUTEN_APP_ID: string;
  readonly VITE_RAKUTEN_ACCESS_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}