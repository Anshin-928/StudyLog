# <img src="public/favicon.svg" width="40" height="40" align="center" alt="StudyLog Logo">&nbsp;&nbsp;StudyLog

### 学習時間・教材・進捗を記録・可視化する学習管理Webアプリ。ストリーク機能やフォロー機能搭載で、継続的な学習習慣をサポート。

### 【 本番URL: https://studylog-app.com 】

<p align="center">
  <img src="https://github.com/user-attachments/assets/a3f5c0e8-43a1-41fb-9feb-7e1afa7f7d46" width="49%" alt="StudyLog Cover">
  <img src="https://github.com/user-attachments/assets/a918889e-219a-467c-acdf-c861ac30288f" width="49%" alt="Feature 1">
  <img src="https://github.com/user-attachments/assets/6e53103c-6903-4e94-a8b7-0e88f38ba5a3" width="49%" alt="Feature 2">
  <img src="https://github.com/user-attachments/assets/76ae88e9-5553-421b-aa24-0557806e0fbb" width="49%" alt="Feature 3">
</p>

---

## 主な機能

### 学習記録
- 教材ごとに学習時間・ページ数・メモ・画像を記録
- 記録の編集・削除

### 教材管理
- 教材の登録・カテゴリ分類
- ドラッグ&ドロップで並び替え
- 楽天ブックス API を使った書籍検索・自動登録

### レポート
- 期間別の学習時間推移グラフ
- 教材別の割合を示す円グラフ
- 教材ランキング

### ホーム / タイムライン
- フォロー中ユーザーの学習記録を表示
- 同じ目標グループのユーザーの記録を閲覧

### ユーザー機能
- プロフィール・自己紹介・目標の設定
- フォロー / フォロワー管理・フォロー申請の承認
- ユーザー検索
- アカウントの公開 / 非公開切り替え

### ストリーク
- 連続学習日数のカウント
- 試験日までのカウントダウン

### その他
- ダークモード / ライトモード対応
- メール認証・Google OAuth ログイン

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React 19, TypeScript, Vite |
| UI ライブラリ | Material UI (MUI) v7, Emotion |
| ルーティング | React Router v7 |
| グラフ | Recharts |
| ドラッグ&ドロップ | dnd-kit |
| バックエンド / DB | Supabase (PostgreSQL) |
| 認証 | Supabase Auth, Google OAuth 2.0 |
| 外部 API | 楽天ブックス API |
| デプロイ | Vercel |

---

## ディレクトリ構成

```
StudyLog/
├── api/
│   └── rakuten.js          # 楽天 API のサーバーサイドハンドラー (Vercel Functions)
├── public/
│   └── images/templates/   # 教材カバー画像テンプレート
├── src/
│   ├── components/         # ページ・UIコンポーネント
│   ├── hooks/              # カスタムフック
│   ├── lib/                # Supabase クライアント・ユーティリティ
│   ├── constants/          # 目標グループ・カテゴリ定数
│   ├── types/              # TypeScript 型定義
│   ├── assets/             # ロゴ・デフォルト画像
│   ├── App.tsx             # ルーティング・テーマ管理
│   └── main.tsx            # エントリーポイント
├── vercel.json             # Vercel デプロイ設定
└── vite.config.ts          # Vite 設定
```

---

## セットアップ

### 前提条件
- Node.js 18 以上
- npm

### 1. リポジトリのクローン

```bash
git clone https://github.com/Anshin-928/StudyLog.git
cd StudyLog
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下を設定します。

```env
VITE_SUPABASE_URL      = your_supabase_url
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
RAKUTEN_APP_ID         = your_rakuten_app_id
RAKUTEN_ACCESS_KEY     = your_rakuten_access_key
```

| 変数名 | 取得場所 |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase プロジェクト設定 > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase プロジェクト設定 > API |
| `RAKUTEN_APP_ID` | [楽天デベロッパー](https://webservice.rakuten.co.jp/) |
| `RAKUTEN_ACCESS_KEY` | [楽天デベロッパー](https://webservice.rakuten.co.jp/) > アプリ管理 |

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開くと確認できます。

---

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動（ホットリロード対応） |
| `npm run build` | 本番用ビルドを生成 |
| `npm run preview` | ビルド結果をローカルでプレビュー |
| `npm run lint` | ESLint によるコード検査 |

---

## デプロイ

Vercel に接続した GitHub リポジトリへのプッシュで自動デプロイされます。
環境変数は Vercel の Project Settings > Environment Variables に設定してください。
