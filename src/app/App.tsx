// src/app/App.tsx

import { useState, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { ColorModeContext } from './contexts';
import type { ColorModeContextType } from './contexts';
import { createAppTheme } from './theme';
import { router } from './router';
import UpdatePrompt from './UpdatePrompt';

const THEME_KEY = 'studylog-theme-mode';

// ==========================================
// App ルート（テーマ管理）
// ==========================================
export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const colorMode = useMemo<ColorModeContextType>(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem(THEME_KEY, next);
          return next;
        });
      },
    }),
    [mode],
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
        <UpdatePrompt />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
