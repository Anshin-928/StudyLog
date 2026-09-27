// src/components/BootGate.tsx
// Service Worker とキャッシュの準備（src/lib/serviceWorkerBoot.ts）が終わるまで、アプリを読み込まない。
// App は Supabase のクライアントを読み込んだ時点で API を呼び始めるため、準備が終わってから動的に import する。
// 準備に失敗したら、古いデータを表示しないままエラーと再試行ボタンを出す（準備は時間制限つきなので、読み込み中のまま止まらない）

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { prepareServiceWorker } from '../lib/serviceWorkerBoot';

const App = lazy(() => import('../App'));

type BootState = 'preparing' | 'ready' | 'failed';

const screenStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '16px', padding: '16px', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
};

export default function BootGate() {
  const [state, setState] = useState<BootState>('preparing');

  const prepare = useCallback(() => {
    setState('preparing');
    prepareServiceWorker()
      .then(() => setState('ready'))
      .catch(error => {
        console.error('[BootGate] 起動前の準備に失敗しました:', error);
        setState('failed');
      });
  }, []);

  useEffect(() => { prepare(); }, [prepare]);

  if (state === 'ready') {
    return (
      <Suspense fallback={<div style={screenStyle} role="status">読み込み中…</div>}>
        <App />
      </Suspense>
    );
  }

  if (state === 'failed') {
    return (
      <div style={screenStyle} role="alert">
        <p style={{ margin: 0 }}>アプリを起動できませんでした。</p>
        <p style={{ margin: 0, fontSize: '14px' }}>通信状況を確認して、もう一度お試しください。</p>
        <button type="button" onClick={prepare} style={{ padding: '8px 20px', fontSize: '15px', cursor: 'pointer' }}>
          再試行
        </button>
      </div>
    );
  }

  return <div style={screenStyle} role="status">読み込み中…</div>;
}
