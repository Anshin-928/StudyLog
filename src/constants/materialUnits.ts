// src/constants/materialUnits.ts

export const MATERIAL_UNITS = ['ページ', '章', '節', '単語', '問', '題'] as const;
export type MaterialUnit = typeof MATERIAL_UNITS[number];
export const DEFAULT_UNIT: MaterialUnit = 'ページ';