// src/lib/materialsApi.ts
// アクティブな教材の取得（Record / EditRecordDialog 共通）

import { supabase } from './supabase';
import type { Material } from '../types/record';

export async function fetchActiveMaterials(fallbackColor = '#ccc'): Promise<Material[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('materials')
    .select('id, title, image_url, unit, categories ( name, color_code, sort_order )')
    .eq('status', 'active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item: any) => ({
    id: item.id,
    categoryName: item.categories?.name || 'カテゴリなし',
    name: item.title,
    image: item.image_url,
    colorCode: item.categories?.color_code || fallbackColor,
    sortOrder: item.categories?.sort_order || 0,
    unit: item.unit || 'ページ',
  }));
}
