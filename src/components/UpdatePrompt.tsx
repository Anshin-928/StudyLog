// src/components/UpdatePrompt.tsx
// 新しいバージョンが公開されたら再読み込みを促す。
// SPA/PWAは開いたままだと古いコードで動き続け、DB側の変更（廃止したAPI・RLSの強化など）と食い違うため、
// 定期的に更新を確認する。新しいService Workerは autoUpdate で自動的に有効になる（vite.config.ts）が、
// 画面のコードは再読み込みするまで古いままなので、入力中の内容を勝手に失わせないよう、再読み込みはユーザーの操作で行う

import { useEffect, useState } from 'react';
import { Button, Snackbar } from '@mui/material';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function UpdatePrompt() {
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return;
    // 初回訪問でService Workerが制御を始めたときは、画面のコードは最新なので知らせない
    const hadController = Boolean(sw.controller);
    const onControllerChange = () => { if (hadController) setUpdated(true); };
    sw.addEventListener('controllerchange', onControllerChange);

    const check = () => {
      sw.getRegistration()
        .then(registration => registration?.update())
        .catch(() => { /* オフライン時などは次回に再確認する */ });
    };
    // バックグラウンドから戻ったときにも確認する（ホーム画面のPWAは開きっぱなしになりやすい）
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <Snackbar
      open={updated}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      // モバイルでは画面下部のナビゲーションに重ならない位置に出す
      sx={{ bottom: { xs: 80, md: 24 } }}
      message="新しいバージョンがあります"
      action={
        <Button color="primary" size="small" onClick={() => window.location.reload()}>
          更新
        </Button>
      }
    />
  );
}
