// src/hooks/useMaterials.ts

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material';
import { supabase } from '../lib/supabase';

// ==========================================
// 型定義（Materials.tsx と共有）
// ==========================================
export interface Material {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
  categorySortOrder: number;
  materialSortOrder: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  colorCode: string;
  sortOrder: number;
}

// ==========================================
// useMaterials フック
// ==========================================
interface UseMaterialsReturn {
  materials: Material[];
  allCategories: CategoryInfo[];
  isLoading: boolean;
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  refetch: () => Promise<void>;
}

export function useMaterials(): UseMaterialsReturn {
  const theme = useTheme();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [{ data, error }, { data: catData, error: catError }] = await Promise.all([
        supabase
          .from('materials')
          .select('id, category_id, title, image_url, sort_order, categories (name, color_code, sort_order)')
          .eq('status', 'active')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('id, name, color_code, sort_order')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
      ]);

      if (error) throw error;
      if (catError) throw catError;

      if (catData) {
        setAllCategories(catData.map((c: any) => ({
          id: c.id,
          name: c.name,
          colorCode: c.color_code || theme.palette.divider,
          sortOrder: c.sort_order || 0,
        })));
      }

      if (data) {
        const formatted: Material[] = data.map((item: any) => ({
          id: item.id,
          categoryId: item.category_id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || theme.palette.divider,
          categorySortOrder: item.categories?.sort_order || 0,
          materialSortOrder: item.sort_order || 0,
        }));
        formatted.sort((a, b) => a.materialSortOrder - b.materialSortOrder);
        setMaterials(formatted);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [theme.palette.divider]);

  useEffect(() => { refetch(); }, [refetch]);

  return { materials, allCategories, isLoading, setMaterials, refetch };
}
