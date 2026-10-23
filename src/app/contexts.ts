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
  // 記録の保存・編集・削除などで、ストリークが変わりうるときに呼ぶ
  onRecordChanged: () => void;
  onProfileSaved: () => void;
}
export const AppCallbacksContext = createContext<AppCallbacksContextType>({
  onRecordChanged: () => {},
  onProfileSaved: () => {},
});
