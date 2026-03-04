// src/types/theme.d.ts

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    streak: Palette['primary'];
    chart: string[];
  }
  interface PaletteOptions {
    streak?: PaletteOptions['primary'];
    chart?: string[];
  }

  // Theme（読み取り時）の型を拡張
  interface Theme {
    customShadows: {
      sm: string;
      md: string;
      lg: string;
    };
  }
  // ThemeOptions（createTheme時の設定）の型を拡張
  interface ThemeOptions {
    customShadows?: {
      sm?: string;
      md?: string;
      lg?: string;
    };
  }
}