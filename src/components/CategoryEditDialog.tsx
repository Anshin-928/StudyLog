// src/components/CategoryEditDialog.tsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, IconButton, TextField, Popover, CircularProgress 
} from '@mui/material';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CircleIcon from '@mui/icons-material/Circle';
import { supabase } from '../lib/supabase';

const PALETTE = ['#1A73E8', '#E53935', '#43A047', '#FFB300', '#8E24AA', '#00ACC1', '#9E9E9E'];
const ITEM_GAP_PX = 12;

interface Category {
  id: string;
  name: string;
  color_code: string;
  sort_order: number;
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

  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const dragEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("カテゴリ取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    if (dragEndTimerRef.current) clearTimeout(dragEndTimerRef.current); 
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      setDraggedIndex(position);
      setDragOverIndex(position);
    }, 0);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedIndex === null || !listContainerRef.current) return;

    const items = Array.from(listContainerRef.current.children) as HTMLElement[];
    const categoryItems = items.slice(0, categories.length);

    let newIndex = categories.length - 1; 
    for (let i = 0; i < categoryItems.length; i++) {
      const rect = categoryItems[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== dragOverIndex) {
      setDragOverIndex(newIndex);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newCategories = [...categories];
      const draggedItem = newCategories.splice(draggedIndex, 1)[0];
      newCategories.splice(dragOverIndex, 0, draggedItem);
      setCategories(newCategories);
      setDraggedIndex(dragOverIndex);
    }

    dragEndTimerRef.current = setTimeout(() => {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }, 200);
  };

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
      id: `new-${Date.now()}`,
      name: '新しいカテゴリ',
      color_code: PALETTE[0],
      sort_order: categories.length
    };
    setCategories([...categories, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('このカテゴリを削除しますか？\n（中の教材は「カテゴリなし」に移動するため消えません）')) {
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let nullCategoryId;
      const { data: nullCat } = await supabase.from('categories').select('id').eq('name', 'カテゴリなし').single();
      if (nullCat) {
        nullCategoryId = nullCat.id;
      } else {
        const { data: newNullCat } = await supabase.from('categories').insert([{ name: 'カテゴリなし', color_code: '#9E9E9E', sort_order: 0 }]).select().single();
        nullCategoryId = newNullCat?.id;
      }

      const { data: dbCategories } = await supabase.from('categories').select('id');
      const currentIds = categories.filter(c => !c.id.startsWith('new-')).map(c => c.id);
      
      //「カテゴリなし」は絶対に削除対象にならないように安全対策
      const deletedIds = dbCategories
        ?.filter(c => c.id !== nullCategoryId)
        .map(c => c.id)
        .filter(id => !currentIds.includes(id)) || [];

      // Promise.all を使ってDB更新を並列化（高速化）
      await Promise.all(deletedIds.map(async (dId) => {
        await supabase.from('materials').update({ category_id: nullCategoryId }).eq('category_id', dId);
        await supabase.from('categories').delete().eq('id', dId);
      }));

      await Promise.all(categories.map((cat, i) => {
        if (cat.id.startsWith('new-')) {
          return supabase.from('categories').insert([{ name: cat.name, color_code: cat.color_code, sort_order: i }]);
        } else {
          return supabase.from('categories').update({ name: cat.name, color_code: cat.color_code, sort_order: i }).eq('id', cat.id);
        }
      }));
      
      onUpdated();
      onClose();
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
            <Box
              ref={listContainerRef}
              sx={{ pt: 1 }}
              onDragOver={handleContainerDragOver}
            >
              {categories.map((cat, index) => {
                const isDefault = cat.name === 'カテゴリなし';
                const isDraggingThis = draggedIndex === index;

                let translateY = '0px';
                if (draggedIndex !== null && dragOverIndex !== null) {
                  if (isDraggingThis) {
                    const shift = dragOverIndex - draggedIndex;
                    // 🌟 ④ 隙間の計算に定数を使用
                    translateY = `calc(${shift} * (100% + ${ITEM_GAP_PX}px))`;
                  } else if (draggedIndex < dragOverIndex && index > draggedIndex && index <= dragOverIndex) {
                    translateY = `calc(-100% - ${ITEM_GAP_PX}px)`;
                  } else if (draggedIndex > dragOverIndex && index >= dragOverIndex && index < draggedIndex) {
                    translateY = `calc(100% + ${ITEM_GAP_PX}px)`;
                  }
                }

                return (
                  <Box 
                    key={cat.id}
                    draggable
                    onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    sx={{ 
                      pb: `${ITEM_GAP_PX}px`,
                      position: 'relative',
                      zIndex: isDraggingThis ? 10 : 1, 
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', alignItems: 'center', p: 1.5,
                        backgroundColor: isDraggingThis ? '#f8fafd' : '#fff', 
                        border: isDraggingThis ? '2px dashed #1A73E8' : '1px solid #e0e0e0', 
                        borderRadius: '8px',
                        opacity: isDraggingThis ? 0.6 : 1, 
                        
                        transform: `translateY(${translateY})`,
                        transition: draggedIndex !== null ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                        pointerEvents: draggedIndex !== null ? 'none' : 'auto',
                        
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        boxShadow: isDraggingThis ? '0 8px 24px rgba(26,115,232,0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <DragIndicatorOutlinedIcon sx={{ color: '#ccc', mr: 1 }} />
                      
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