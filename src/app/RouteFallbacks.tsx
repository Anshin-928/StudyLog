// src/app/RouteFallbacks.tsx

import { useEffect } from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button } from '@mui/material';

import { isChunkLoadError } from '../lib/lazyWithReload';

export function FullScreenLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100dvh',
        backgroundColor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

// 画面の表示に失敗したときに出す。画面のファイルを読み込めなかったとき（自動で読み込み直しても失敗したとき）は通信状況の確認を促し、
// それ以外（画面のコードの不具合など）は通信の問題に見せない。存在しない URL は不具合ではないので、ホームへの導線を出す。
// inline のときはアプリの枠（サイドバーなど）の中に出す
export function RouteErrorScreen({ inline = false }: { inline?: boolean }) {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunkLoadFailed = isChunkLoadError(error);
  const unexpected = !notFound && !chunkLoadFailed;

  // 描画のたびに記録しないよう、エラーが変わったときだけ記録する
  useEffect(() => {
    if (unexpected) console.error('[RouteErrorScreen]', error);
  }, [error, unexpected]);

  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
        p: 2,
        textAlign: 'center',
        ...(inline
          ? { flexGrow: 1, minHeight: '40vh' }
          : { height: '100dvh', backgroundColor: 'background.default' }),
      }}
    >
      {notFound ? (
        <>
          <Typography>ページが見つかりませんでした。</Typography>
          <Typography variant="body2" color="text.secondary">
            URL が正しいか確認してください。
          </Typography>
          <Button variant="contained" component={Link} to="/">
            ホームへ
          </Button>
        </>
      ) : (
        <>
          <Typography>画面を表示できませんでした。</Typography>
          <Typography variant="body2" color="text.secondary">
            {chunkLoadFailed
              ? '通信状況を確認して、ページを再読み込みしてください。'
              : '予期しないエラーが発生しました。ページを再読み込みしても解決しない場合は、お問い合わせください。'}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            再読み込み
          </Button>
        </>
      )}
    </Box>
  );
}

export function PageLoader() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexGrow: 1,
        minHeight: '40vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
