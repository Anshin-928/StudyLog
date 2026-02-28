// src/lib/categoryUtils.ts
// カテゴリ関連の型・定数・ユーティリティ。AddMaterial / MaterialEditDialog で共用。

import { supabase } from './supabase';

// ==========================================
// 型・定数
// ==========================================

export interface CategoryOption {
  id: string;
  name: string;
  isNew?: boolean; // true のとき「新しいカテゴリとして作成」を意味する
}

/** isNew な option の id プレフィックス（既存 ID との衝突を防ぐ） */
export const NEW_CATEGORY_PREFIX = '__new__';

// ==========================================
// カテゴリ候補リストの生成
//
// 入力文字列が既存カテゴリと完全一致しない場合のみ
// 末尾に「新規作成」option を追加する。
// ==========================================
export const buildCategoryOptions = (
  inputValue: string,
  base: CategoryOption[]
): CategoryOption[] => {
  const trimmed = inputValue.trim();
  const exactMatch = base.some(c => c.name === trimmed);

  if (trimmed && !exactMatch) {
    return [
      ...base,
      { id: `${NEW_CATEGORY_PREFIX}${trimmed}`, name: trimmed, isNew: true },
    ];
  }
  return base;
};

// ==========================================
// カテゴリ名 → ID 解決
//
// 既存カテゴリがあればその ID を返し、
// なければ INSERT して新しい ID を返す。
// ==========================================
export const resolveCategory = async (
  name: string,
  colorCode?: string
): Promise<string> => {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) return existing.id;

  const insertData: Record<string, string> = { name };
  // 「カテゴリなし」はデフォルトでグレー、または呼び出し元が colorCode を指定できる
  if (colorCode) {
    insertData.color_code = colorCode;
  } else if (name === 'カテゴリなし') {
    insertData.color_code = '#9E9E9E';
  }

  const { data: created, error } = await supabase
    .from('categories')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return created.id;
};