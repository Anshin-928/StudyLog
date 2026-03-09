// src/components/Materials.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, CircularProgress, IconButton, Menu, MenuItem, ListItemIcon, Tooltip,
  Snackbar, Alert, useMediaQuery, useTheme, alpha,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AddIcon from '@mui/icons-material/Add';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';
import CategoryEditDialog from './CategoryEditDialog';
import MaterialEditDialog from './MaterialEditDialog';
import ConfirmDialog from './ConfirmDialog';
import MaterialCard from './MaterialCard';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';

import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ==========================================
// 型定義
// ==========================================
interface Material {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
  categorySortOrder: number;
  materialSortOrder: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  colorCode: string;
  sortOrder: number;
}

// ==========================================
// ユーティリティ
// ==========================================
function buildSortedEntries(
  materials: Material[],
  allCategories?: CategoryInfo[]
): [string, Material[], CategoryInfo | undefined][] {
  const grouped: Record<string, Material[]> = {};
  for (const m of materials) {
    if (!grouped[m.categoryName]) grouped[m.categoryName] = [];
    grouped[m.categoryName].push(m);
  }
  if (allCategories) {
    for (const cat of allCategories) {
      if (!grouped[cat.name]) grouped[cat.name] = [];
    }
  }
  const catInfoMap = new Map<string, CategoryInfo>();
  if (allCategories) {
    for (const cat of allCategories) catInfoMap.set(cat.name, cat);
  }
  return Object.entries(grouped)
    .map(([name, items]): [string, Material[], CategoryInfo | undefined] => [name, items, catInfoMap.get(name)])
    .sort((a, b) => {
      const orderA = a[2]?.sortOrder ?? a[1][0]?.categorySortOrder ?? 0;
      const orderB = b[2]?.sortOrder ?? b[1][0]?.categorySortOrder ?? 0;
      return orderA - orderB;
    });
}

// ==========================================
// ソータブル教材アイテム
// ==========================================
function SortableMaterialItem({
  item, onDelete, onEdit,
}: {
  item: Material;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ opacity: isDragging ? 0.3 : 1 }}>
      <MaterialCard
        material={item}
        onDelete={onDelete}
        onEdit={onEdit}
        isReorderMode
        dragHandleProps={{ ...attributes, ...listeners } as Record<string, unknown>}
      />
    </Box>
  );
}

// ==========================================
// 空カテゴリ用ドロップゾーン
// ==========================================
function EmptyCategoryDropzone({ categoryName, isOver }: { categoryName: string; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: `cat-drop-${categoryName}` });
  const theme = useTheme();
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: '100px',
        borderRadius: '12px',
        border: '2px dashed',
        borderColor: isOver ? 'primary.main' : 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isOver ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <Typography variant="body2" sx={{ color: isOver ? 'primary.main' : 'text.disabled', pointerEvents: 'none' }}>
        ここにドロップして移動
      </Typography>
    </Box>
  );
}

// ==========================================
// メインコンポーネント
// ==========================================
export default function Materials() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [materials, setMaterials] = useState<Material[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // dnd-kit drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const deleteMaterialName = materials.find(m => m.id === deleteMaterialId)?.name ?? '';

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'info' | 'success' }>({
    open: false, message: '', severity: 'error',
  });
  const showSnackbar = (message: string, severity: 'error' | 'info' | 'success' = 'error') =>
    setSnackbar({ open: true, message, severity });
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  // 並べ替えモード中は離脱ブロック
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isReorderMode && currentLocation.pathname !== nextLocation.pathname
  );

  // ==========================================
  // dnd-kit センサー
  // PC: MouseSensor、タッチ: TouchSensor（150ms でドラッグ開始）
  // ==========================================
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  // ==========================================
  // メニュー操作
  // ==========================================
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const openCategoryDialog = () => { handleMenuClose(); setIsCategoryDialogOpen(true); };
  const handleReorderModeStart = () => { handleMenuClose(); setIsReorderMode(true); };

  // ==========================================
  // データ取得
  // ==========================================
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('materials')
        .select(`id, category_id, title, image_url, sort_order, categories (name, color_code, sort_order)`)
        .eq('status', 'active')
        .eq('user_id', user.id);
      if (error) throw error;

      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, color_code, sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      if (catError) throw catError;

      if (catData) {
        setAllCategories(catData.map((c: any) => ({
          id: c.id, name: c.name,
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

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // ==========================================
  // dnd-kit ドラッグハンドラ
  // ==========================================
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setOverDropId(null); return; }

    const activeId = String(active.id);
    const overId = String(over.id);
    setOverDropId(overId);

    if (activeId === overId) return;

    const activeMat = materials.find(m => m.id === activeId);
    if (!activeMat) return;

    // 空カテゴリへのドロップ
    if (overId.startsWith('cat-drop-')) {
      const overCategoryName = overId.replace('cat-drop-', '');
      if (activeMat.categoryName === overCategoryName) return;
      const catInfo = allCategories.find(c => c.name === overCategoryName);
      if (!catInfo) return;
      setMaterials(prev => prev.map(m => m.id === activeId
        ? { ...m, categoryId: catInfo.id, categoryName: catInfo.name, colorCode: catInfo.colorCode, categorySortOrder: catInfo.sortOrder }
        : m
      ));
      return;
    }

    const overMat = materials.find(m => m.id === overId);
    if (!overMat) return;

    if (activeMat.categoryName === overMat.categoryName) {
      // 同カテゴリ内で並べ替え
      setMaterials(prev => {
        const oldIndex = prev.findIndex(m => m.id === activeId);
        const newIndex = prev.findIndex(m => m.id === overId);
        if (oldIndex === newIndex) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    } else {
      // カテゴリをまたいで移動
      const catInfo = allCategories.find(c => c.name === overMat.categoryName);
      if (!catInfo) return;
      setMaterials(prev => {
        const idx = prev.findIndex(m => m.id === activeId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const item = { ...updated[idx], categoryId: catInfo.id, categoryName: catInfo.name, colorCode: catInfo.colorCode, categorySortOrder: catInfo.sortOrder };
        updated.splice(idx, 1);
        const overIdx = updated.findIndex(m => m.id === overId);
        updated.splice(overIdx, 0, item);
        return updated;
      });
    }
  };

  const handleDragEnd = (_event: DragEndEvent) => {
    setActiveDragId(null);
    setOverDropId(null);
  };

  // ==========================================
  // 完了ボタン（DB保存）
  // ==========================================
  const sortedCategoryEntries = buildSortedEntries(materials, isReorderMode ? allCategories : undefined);

  const handleReorderModeEnd = async () => {
    setIsSaving(true);
    try {
      const allItems = sortedCategoryEntries.flatMap(([, items]) => items);
      await Promise.all(
        allItems.map((item, index) =>
          supabase.from('materials')
            .update({ sort_order: index, category_id: item.categoryId })
            .eq('id', item.id)
            .then(({ error }) => { if (error) throw error; })
        )
      );
      setIsReorderMode(false);
      showSnackbar('並べ替えを保存しました', 'success');
    } catch (error) {
      console.error(error);
      showSnackbar('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 削除・編集
  // ==========================================
  const handleDelete = (id: string) => setDeleteMaterialId(id);

  const handleConfirmDelete = async () => {
    if (!deleteMaterialId) return;
    const id = deleteMaterialId;
    setDeleteMaterialId(null);
    const { error } = await supabase.from('materials').update({ status: 'archived' }).eq('id', id);
    if (error) { console.error(error); showSnackbar('削除に失敗しました。時間をおいて再度お試しください。'); return; }
    setMaterials(prev => prev.filter(m => m.id !== id));
    showSnackbar('教材を削除しました', 'success');
  };

  const handleEdit = (id: string) => setEditMaterialId(id);

  const activeDragMat = materials.find(m => m.id === activeDragId);

  // ==========================================
  // レンダリング
  // ==========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 4, color: 'text.primary', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
            <MenuBookOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>
            {isReorderMode ? '教材の並べ替え' : '教材管理'}
          </Typography>
        </Box>

        {isReorderMode ? (
          <Button variant="contained" size="large" onClick={handleReorderModeEnd} disabled={isSaving} disableElevation sx={{ borderRadius: '8px', fontWeight: 'bold', px: 4 }}>
            {isSaving ? '保存中...' : '完了'}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', alignContent: 'center', gap: isMobile ? 0.3 : 2 }}>
            <Tooltip title="カテゴリや教材の整理">
              <IconButton onClick={handleMenuOpen} sx={{ color: 'text.secondary', borderRadius: '50%', '&:hover': { backgroundColor: 'action.hover' } }}>
                <FormatListBulletedIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              sx={{ '& .MuiPaper-root': { borderRadius: '12px', minWidth: '180px', backgroundImage: 'none', boxShadow: theme.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.3)' } }}
            >
              <MenuItem onClick={openCategoryDialog} sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}>
                <ListItemIcon><BookmarksOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                カテゴリを編集
              </MenuItem>
              <MenuItem onClick={handleReorderModeStart} sx={{ borderRadius: '8px', mx: 1 }}>
                <ListItemIcon><SwapVertOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                教材を並べ替え
              </MenuItem>
            </Menu>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size={isMobile ? 'small' : 'large'}
              onClick={() => navigate('/materials/add-new-material')}
              sx={{
                borderRadius: '5px', boxShadow: 'none', fontWeight: 'bold', px: isMobile ? 1.5 : 3,
                '& .MuiButton-startIcon': { marginRight: isMobile ? '4px' : '8px', marginLeft: isMobile ? '-4px' : '-4px' }
              }}
            >
              教材を追加
            </Button>
          </Box>
        )}
      </Box>

      {/* メインコンテンツ */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : materials.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', color: 'text.disabled' }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>まだ教材がありません</Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>右上のボタンから追加してみましょう</Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: isMobile ? 1 : 1, pr: isMobile ? 1 : 1, pb: isMobile ? 0 : 3, pt: 1 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <Grid container spacing={isMobile ? 2 : 4} direction="column">
              {sortedCategoryEntries.map(([categoryName, items, catInfo]) => {
                const groupColor = catInfo?.colorCode ?? items[0]?.colorCode ?? theme.palette.primary.main;
                const isEmpty = items.length === 0;
                if (isEmpty && !isReorderMode) return null;

                const isOverEmpty = overDropId === `cat-drop-${categoryName}`;

                return (
                  <Grid size={12} key={categoryName} sx={{ mb: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 'bold', color: 'text.primary', mb: 2, pl: 1.5, borderLeft: `4px solid ${groupColor}` }}
                    >
                      {categoryName}
                    </Typography>

                    <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                      {isEmpty ? (
                        <EmptyCategoryDropzone categoryName={categoryName} isOver={isOverEmpty} />
                      ) : (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, 195px)',
                            gap: isMobile ? 1 : 2,
                          }}
                        >
                          {isReorderMode ? (
                            items.map(item => (
                              <SortableMaterialItem key={item.id} item={item} onDelete={handleDelete} onEdit={handleEdit} />
                            ))
                          ) : (
                            items.map(item => (
                              <MaterialCard key={item.id} material={item} onDelete={handleDelete} onEdit={handleEdit} />
                            ))
                          )}
                        </Box>
                      )}
                    </SortableContext>
                  </Grid>
                );
              })}
            </Grid>

            {/* ドラッグ中に指/カーソルに吸い付くオーバーレイ */}
            <DragOverlay>
              {activeDragMat && (
                <Box sx={{ transform: 'scale(1.03)', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', borderRadius: '12px', cursor: 'grabbing' }}>
                  <MaterialCard material={activeDragMat} onDelete={() => {}} onEdit={() => {}} isReorderMode />
                </Box>
              )}
            </DragOverlay>
          </DndContext>
        </Box>
      )}

      {/* 各種ダイアログ */}
      <ConfirmDialog
        open={deleteMaterialId !== null}
        title="教材を削除しますか？"
        message={<><strong>「{deleteMaterialName}」</strong>を削除します。<br />削除した教材は元に戻せません。</>}
        confirmLabel="削除する"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteMaterialId(null)}
      />

      <CategoryEditDialog
        open={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onUpdated={() => fetchMaterials()}
      />

      <MaterialEditDialog
        materialId={editMaterialId}
        onClose={() => setEditMaterialId(null)}
        onUpdated={() => { fetchMaterials(); showSnackbar('教材を更新しました', 'success'); }}
      />

      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        message={'並べ替えの変更が保存されていません。\nこのページを離れると、変更が破棄されます。'}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
