// src/components/CategoryEditDialog.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Typography, IconButton, TextField, Popover, CircularProgress 
} from '@mui/material';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CircleIcon from '@mui/icons-material/Circle';
import { supabase } from '../lib/supabase';

// カラーパレットの選択肢
const PALETTE = ['#1A73E8', '#E53935', '#43A047', '#FFB300', '#8E24AA', '#00ACC1', '#9E9E9E'];

interface Category {
  id: string;
  name: string;
  color_code: string;
}

interface CategoryEditDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function CategoryEditDialog({ open, onClose, onUpdated }: CategoryEditDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // カラーピッカー用のState
  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // ドラッグ＆ドロップ用のRef
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ダイアログが開くたびに最新のカテゴリを取得
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      // 実際にはsort_orderなどの列で並び替えるのが理想ですが、今回は作成順で取得します
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("カテゴリ取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ドラッグ＆ドロップの処理
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newCategories = [...categories];
    const draggedItemContent = newCategories.splice(dragItem.current, 1)[0];
    newCategories.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setCategories(newCategories);
  };

  // カテゴリの操作
  const handleNameChange = (id: string, newName: string) => {
    setCategories(categories.map(cat => cat.id === id ? { ...cat, name: newName } : cat));
  };

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setColorAnchorEl(event.currentTarget);
    setActiveCategoryId(id);
  };

  const handleColorSelect = (color: string) => {
    if (activeCategoryId) {
      setCategories(categories.map(cat => cat.id === activeCategoryId ? { ...cat, color_code: color } : cat));
    }
    setColorAnchorEl(null);
  };

  const handleAddCategory = () => {
    const newCat: Category = {
      id: `new-${Date.now()}`, // 保存用の一時的なID
      name: '新しいカテゴリ',
      color_code: PALETTE[0]
    };
    setCategories([...categories, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('このカテゴリを削除しますか？\n（中の教材は「カテゴリなし」に移動するため消えません）')) {
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  // DBへ保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 「カテゴリなし」のIDを確保（なければ作る）
      let nullCategoryId;
      const { data: nullCat } = await supabase.from('categories').select('id').eq('name', 'カテゴリなし').single();
      if (nullCat) {
        nullCategoryId = nullCat.id;
      } else {
        const { data: newNullCat } = await supabase.from('categories').insert([{ name: 'カテゴリなし', color_code: '#9E9E9E' }]).select().single();
        nullCategoryId = newNullCat?.id;
      }

      // 現在のDBのカテゴリ一覧を取得して、消されたカテゴリを特定
      const { data: dbCategories } = await supabase.from('categories').select('id');
      const currentIds = categories.filter(c => !c.id.startsWith('new-')).map(c => c.id);
      const deletedIds = dbCategories?.map(c => c.id).filter(id => !currentIds.includes(id)) || [];

      // 消されたカテゴリに紐づく教材を「カテゴリなし」に退避
      for (const dId of deletedIds) {
        await supabase.from('materials').update({ category_id: nullCategoryId }).eq('category_id', dId);
        await supabase.from('categories').delete().eq('id', dId);
      }

      // 追加・更新されたカテゴリを保存（UPSERT）
      for (const cat of categories) {
        if (cat.id.startsWith('new-')) {
          await supabase.from('categories').insert([{ name: cat.name, color_code: cat.color_code }]);
        } else {
          await supabase.from('categories').update({ name: cat.name, color_code: cat.color_code }).eq('id', cat.id);
        }
      }

      // 注意: 今回は順番(sort_order)のDB保存は省略しています（実装にはDBのカラム追加が必要です）
      
      onUpdated(); // メイン画面の再読み込みをトリガー
      onClose();   // ダイアログを閉じる
    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={!isSaving ? onClose : undefined} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>カテゴリの整理</DialogTitle>
        <DialogContent sx={{ minHeight: '300px' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ pt: 1 }}>
{categories.map((cat, index) => {
                const isDefault = cat.name === 'カテゴリなし';
                return (
                  <Box 
                    key={cat.id}
                    draggable={!isDefault}
                    onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, index)}
                    onDragEnter={(e: React.DragEvent<HTMLDivElement>) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
                    sx={{ 
                      display: 'flex', alignItems: 'center', mb: 1.5, 
                      opacity: isDefault ? 0.8 : 1
                    }}
                  >
                    {/* グリップアイコン */}
                    <DragIndicatorOutlinedIcon sx={{ color: isDefault ? 'transparent' : '#ccc', cursor: isDefault ? 'default' : 'grab', mr: 1 }} />
                    
                    {/* カード部分 */}
                    <Box sx={{ 
                      flexGrow: 1, display: 'flex', alignItems: 'center', p: 1.5, 
                      backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <IconButton size="small" onClick={(e: React.MouseEvent<HTMLButtonElement>) => !isDefault && handleColorClick(e, cat.id)} sx={{ mr: 1, p: 0.5 }} disabled={isDefault}>
                        <CircleIcon sx={{ color: cat.color_code, fontSize: '20px' }} />
                      </IconButton>
                      
                      <TextField 
                        variant="standard" 
                        value={cat.name} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(cat.id, e.target.value)}
                        disabled={isDefault}
                        fullWidth 
                        InputProps={{ disableUnderline: true, sx: { fontWeight: 'bold', color: '#333' } }} 
                      />

                      {!isDefault && (
                        <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)} sx={{ ml: 1, color: '#999', '&:hover': { color: '#d32f2f' } }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}


              <Button startIcon={<AddIcon />} onClick={handleAddCategory} sx={{ mt: 2, fontWeight: 'bold', pl: 4 }}>
                新しいカテゴリを追加
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={isSaving} sx={{ color: '#666', fontWeight: 'bold' }}>キャンセル</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving} disableElevation sx={{ borderRadius: '8px', fontWeight: 'bold', px: 4 }}>
            {isSaving ? '保存中...' : '保存して完了'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* カラーパレットのポップオーバー */}
      <Popover 
        open={Boolean(colorAnchorEl)} 
        anchorEl={colorAnchorEl} 
        onClose={() => setColorAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ '& .MuiPaper-root': { borderRadius: '12px', p: 1.5, display: 'flex', gap: 1 } }}
      >
        {PALETTE.map(color => (
          <IconButton key={color} onClick={() => handleColorSelect(color)} sx={{ p: 0.5 }}>
            <CircleIcon sx={{ color: color, fontSize: '28px' }} />
          </IconButton>
        ))}
      </Popover>
    </>
  );
}