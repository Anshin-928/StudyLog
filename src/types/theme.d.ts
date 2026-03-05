// src/types/theme.d.ts

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    customShadows: {
      sm: string;
      md: string;
      lg: string;
    };
  }

  interface ThemeOptions {
    customShadows?: {
      sm?: string;
      md?: string;
      lg?: string;
    };
  }

  interface Palette {
    streak: {
      main: string;
      lighter: string;
      border: string;
    };
    chart: string[];
  }

  interface PaletteOptions {
    streak?: {
      main?: string;
      lighter?: string;
      border?: string;
    };
    chart?: string[];
  }

  interface PaletteColor {
    lighter?: string;
  }
  
  interface SimplePaletteColorOptions {
    lighter?: string;
  }

  interface TypeBackground {
    subtle: string;
    overlay: string;
  }
}