// src/types/record.ts
// 記録入力（Record / EditRecordDialog）で共有するアプリ内型

export interface Material {
  id: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
  sortOrder: number;
  unit: string;
}

export interface PagesData {
  mode: 'total' | 'range';
  total: string;
  rangeStart: string;
  rangeEnd: string;
}
