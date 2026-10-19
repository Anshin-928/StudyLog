// src/app/contexts.ts

import { createContext } from 'react';

export interface ColorModeContextType {
  mode: string;
  toggleColorMode: () => void;
}
export const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

export interface AppCallbacksContextType {
  onRecordSaved: () => void;
  onProfileSaved: () => void;
}
export const AppCallbacksContext = createContext<AppCallbacksContextType>({
  onRecordSaved: () => {},
  onProfileSaved: () => {},
});
