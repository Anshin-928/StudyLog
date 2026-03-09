// src/components/CategoryEditDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, IconButton, TextField, Popover, CircularProgress,
  Snackbar, Alert, Typography, useTheme, alpha,
} from '@mui/material';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import CircleIcon from '@mui/icons-material/Circle';
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import ConfirmDialog from './ConfirmDialog';

const PALETTE = ['#1A73E8', '#E53935', '#43A047', '#FFB300', '#8E24AA', '#00ACC1', '#9E9E9E'];

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

// ==========================================
// ソータブル行コンポーネント
// ==========================================
function SortableCategoryRow({
  cat, isDefault, onColorClick, onNameChange, onDelete,
}: {
  cat: Category;
  isDefault: boolean;
  onColorClick: (e: React.MouseEvent<HTMLElement>, id: string) => void;
  onNameChange: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id, disabled: isDefault });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ pb: '12px' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', p: 1.5,
          backgroundColor: isDragging
            ? alpha(theme.palette.primary.main, 0.08)
            : 'background.paper',
          border: '1px solid',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderRadius: '8px',
          opacity: isDragging ? 0.5 : 1,
          boxShadow: isDragging ? theme.customShadows.md : 'none',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {/* ドラッグハンドル */}
        <Box
          {...(isDefault ? {} : { ...attributes, ...listeners })}
          sx={{
            display: 'flex', alignItems: 'center', mr: 1,
            cursor: isDefault ? 'default' : 'grab',
            touchAction: 'none',
            '&:active': { cursor: isDefault ? 'default' : 'grabbing' },
            opacity: isDefault ? 0 : 1,
          }}
        >
          <DragIndicatorOutlinedIcon sx={{ color: 'text.disabled' }} />
        </Box>

        <IconButton
          size="small"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => !isDefault && onColorClick(e, cat.id)}
          sx={{ mr: 1, p: 0.5 }}
          disabled={isDefault}
        >
          <CircleIcon sx={{ color: cat.color_code, fontSize: '20px' }} />
        </IconButton>

        <TextField
          variant="standard"
          value={cat.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(cat.id, e.target.value)}
          disabled={isDefault}
          fullWidth
          InputProps={{ disableUnderline: true, sx: { fontWeight: 'bold', color: 'text.primary' } }}
        />

        {!isDefault && (
          <IconButton
            size="small"
            onClick={() => onDelete(cat.id)}
            sx={{ ml: 1, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

// ==========================================
// メイン
// ==========================================
export default function CategoryEditDialog({ open, onClose, onUpdated }: CategoryEditDialogProps) {
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [colorAnchorEl, setColorAnchorEl] = useState<null | HTMLElement>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const deleteCategoryName = categories.find(c => c.id === deleteCategoryId)?.name ?? '';

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const showSnackbar = (message: string) => setSnackbar({ open: true, message });
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  // ==========================================
  // dnd-kit センサー設定
  // PC: MouseSensor（すぐ反応）
  // タッチ: TouchSensor（8px以上動かすとドラッグ開始 → スクロールと共存）
  // ==========================================
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,       // 150ms 押し続けるとドラッグ開始
        tolerance: 8,     // 8px 以内の動きはスクロールではなくドラッグ意図と判断
      },
    }),
  );

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', user.id).order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("カテゴリ取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setCategories(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id);
      const newIndex = prev.findIndex(c => c.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleNameChange = (id: string, newName: string) => {
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, name: newName } : cat));
  };

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setColorAnchorEl(event.currentTarget);
    setActiveCategoryId(id);
  };

  const handleColorSelect = (color: string) => {
    if (activeCategoryId) {
      setCategories(prev => prev.map(cat => cat.id === activeCategoryId ? { ...cat, color_code: color } : cat));
    }
    setColorAnchorEl(null);
  };

  const handleAddCategory = () => {
    const newCat: Category = {
      id: `new-${Date.now()}`,
      name: '新しいカテゴリ',
      color_code: PALETTE[0],
      sort_order: categories.length,
    };
    setCategories(prev => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => setDeleteCategoryId(id);

  const handleConfirmDelete = () => {
    setCategories(prev => prev.filter(cat => cat.id !== deleteCategoryId));
    setDeleteCategoryId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let nullCategoryId;
      const { data: nullCat } = await supabase.from('categories').select('id').eq('name', 'カテゴリなし').eq('user_id', user.id).single();
      if (nullCat) {
        nullCategoryId = nullCat.id;
      } else {
        const { data: newNullCat } = await supabase.from('categories').insert([{ name: 'カテゴリなし', color_code: theme.palette.divider, sort_order: 0, user_id: user.id }]).select().single();
        nullCategoryId = newNullCat?.id;
      }

      const { data: dbCategories } = await supabase.from('categories').select('id').eq('user_id', user.id);
      const currentIds = categories.filter(c => !c.id.startsWith('new-')).map(c => c.id);
      const deletedIds = dbCategories?.filter(c => c.id !== nullCategoryId).map(c => c.id).filter(id => !currentIds.includes(id)) || [];

      await Promise.all(deletedIds.map(async (dId) => {
        await supabase.from('materials').update({ category_id: nullCategoryId }).eq('category_id', dId);
        await supabase.from('categories').delete().eq('id', dId);
      }));

      await Promise.all(categories.map((cat, i) => {
        if (cat.id.startsWith('new-')) {
          return supabase.from('categories').insert([{ name: cat.name, color_code: cat.color_code, sort_order: i, user_id: user.id }]);
        } else {
          return supabase.from('categories').update({ name: cat.name, color_code: cat.color_code, sort_order: i }).eq('id', cat.id);
        }
      }));

      onUpdated();
      onClose();
    } catch (error) {
      console.error("保存エラー:", error);
      showSnackbar("保存中にエラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const activeDragCat = categories.find(c => c.id === activeDragId);

  return (
    <>
      <Dialog
        open={open}
        onClose={(_, reason) => { if (reason === 'backdropClick') return; if (!isSaving) onClose(); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>カテゴリの編集</DialogTitle>
        <DialogContent sx={{ minHeight: '300px' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <Box sx={{ pt: 1 }}>
                  {categories.map(cat => (
                    <SortableCategoryRow
                      key={cat.id}
                      cat={cat}
                      isDefault={cat.name === 'カテゴリなし'}
                      onColorClick={handleColorClick}
                      onNameChange={handleNameChange}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                  <Button startIcon={<AddIcon />} onClick={handleAddCategory} sx={{ mt: 2, fontWeight: 'bold', pl: 4 }}>
                    新しいカテゴリを追加
                  </Button>
                </Box>
              </SortableContext>

              {/* ドラッグ中に指/カーソルに吸い付く見た目 */}
              <DragOverlay>
                {activeDragCat && (
                  <Box
                    sx={{
                      display: 'flex', alignItems: 'center', p: 1.5,
                      backgroundColor: 'background.paper',
                      border: '1px solid', borderColor: 'primary.main',
                      borderRadius: '8px',
                      boxShadow: theme.customShadows.lg ?? theme.customShadows.md,
                      opacity: 0.95,
                      userSelect: 'none',
                    }}
                  >
                    <DragIndicatorOutlinedIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <CircleIcon sx={{ color: activeDragCat.color_code, fontSize: '20px', mr: 1 }} />
                    <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      {activeDragCat.name}
                    </Typography>
                  </Box>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={onClose} disabled={isSaving} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
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
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px', p: 1.5, display: 'flex', gap: 1,
            backgroundColor: 'background.paper', backgroundImage: 'none',
            boxShadow: theme.customShadows.md,
          }
        }}
      >
        {PALETTE.map(color => (
          <IconButton key={color} onClick={() => handleColorSelect(color)} sx={{ p: 0.5 }}>
            <CircleIcon sx={{ color: color, fontSize: '28px' }} />
          </IconButton>
        ))}
      </Popover>

      <ConfirmDialog
        open={deleteCategoryId !== null}
        title="カテゴリを削除しますか？"
        message={
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              カテゴリ<strong>「{deleteCategoryName}」</strong>を削除します。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              このカテゴリに含まれる教材は削除されず、<strong>「カテゴリなし」</strong>に自動的に移動します。
            </Typography>
          </>
        }
        confirmLabel="削除する"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCategoryId(null)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
