// src/app/theme.ts

import { createTheme } from '@mui/material';

// アプリ全体の MUI テーマ（独自に追加したプロパティの型は src/types/theme.d.ts）
export function createAppTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#4285F4',
        lighter: mode === 'dark' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(66, 133, 244, 0.08)',
      },
      chart: [
        '#1A73E8',
        '#34A853',
        '#EA4335',
        '#FBBC05',
        '#8E24AA',
        '#00ACC1',
        '#FF6D00',
        '#546E7A',
        '#D81B60',
        '#00897B',
      ],
      error: {
        main: mode === 'dark' ? '#ff5252' : '#d32f2f',
        dark: mode === 'dark' ? '#ff867f' : '#b71c1c',
        lighter: mode === 'dark' ? 'rgba(255, 82, 82, 0.15)' : 'rgba(211, 47, 47, 0.05)',
        contrastText: '#FFFFFF',
      },
      success: {
        main: mode === 'dark' ? '#81c995' : '#34A853',
        lighter: mode === 'dark' ? 'rgba(129, 201, 149, 0.15)' : 'rgba(52, 168, 83, 0.1)',
      },
      warning: {
        main: mode === 'dark' ? '#fdd663' : '#FBBC04',
        lighter: mode === 'dark' ? 'rgba(253, 214, 99, 0.15)' : 'rgba(251, 188, 4, 0.1)',
      },
      streak: {
        main: '#FF6B00',
        lighter: mode === 'dark' ? 'rgba(255, 107, 0, 0.15)' : '#FFF4EC',
        border: mode === 'dark' ? 'rgba(255, 107, 0, 0.3)' : '#FFE0C2',
      },
      background: {
        default: mode === 'dark' ? '#202124' : '#F0F4F9',
        paper: mode === 'dark' ? '#303134' : '#FFFFFF',
        subtle: mode === 'dark' ? '#3c4043' : '#f9f9f9',
        overlay: mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
      },
      text: {
        primary: mode === 'dark' ? '#e8eaed' : '#333333',
        secondary: mode === 'dark' ? '#9aa0a6' : '#666666',
        disabled: mode === 'dark' ? '#5f6368' : '#aaaaaa',
      },
      divider: mode === 'dark' ? '#3c4043' : '#E8E8E8',
    },
    customShadows: {
      sm: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
      md: mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
      lg: mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.2)',
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  });
}
