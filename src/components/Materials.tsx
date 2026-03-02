// src/components/Materials.tsx

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, CircularProgress, IconButton, Menu, MenuItem, ListItemIcon, Tooltip,
  Snackbar, Alert, useMediaQuery, useTheme,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AddIcon from '@mui/icons-material/Add';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import CategoryEditDialog from './CategoryEditDialog';
import MaterialEditDialog from './MaterialEditDialog';
import ConfirmDialog from './ConfirmDialog';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';

import MaterialCard from './MaterialCard';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';

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
// ユーティリティ: カテゴリごとにグルーピング → ソート済みエントリ
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
// メインコンポーネント
// ==========================================
export default function Materials() {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [isReorderMode, setIsReorderMode] = useState(false);

  // 並べ替えモード中は離脱ブロック
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isReorderMode && currentLocation.pathname !== nextLocation.pathname
  );
  const [draggedMaterialId, setDraggedMaterialId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 編集ダイアログ用 state（null のとき閉じる）
  const [editMaterialId, setEditMaterialId] = useState<string | null>(null);

  // 削除確認ダイアログ用 state（null のとき閉じる）
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null);
  const deleteMaterialName = materials.find(m => m.id === deleteMaterialId)?.name ?? '';

  const [allCategories, setAllCategories] = useState<CategoryInfo[]>([]);

  // ==========================================
  // FLIP アニメーション用 Refs
  // ==========================================
  const positionsRef = useRef<Map<string, DOMRect>>(new Map());
  const flipPendingRef = useRef(false);
  const lastDragOverRef = useRef<{ categoryName: string; insertIndex: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const categoryContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'error' | 'info' | 'success' }>({
    open: false, message: '', severity: 'error'
  });
  const showSnackbar = (message: string, severity: 'error' | 'info' | 'success' = 'error') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

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
  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('materials')
        .select(`
          id,
          category_id,
          title,
          image_url,
          sort_order,
          categories (
            name,
            color_code,
            sort_order
          )
        `)
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
          id: c.id,
          name: c.name,
          colorCode: c.color_code || '#e0e0e0',
          sortOrder: c.sort_order || 0,
        })));
      }

      if (data) {
        const formattedData: Material[] = data.map((item: any) => ({
          id: item.id,
          categoryId: item.category_id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || '#e0e0e0',
          categorySortOrder: item.categories?.sort_order || 0,
          materialSortOrder: item.sort_order || 0,
        }));

        formattedData.sort((a, b) => a.materialSortOrder - b.materialSortOrder);
        setMaterials(formattedData);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // ==========================================
  // FLIP アニメーション
  // ==========================================
  useLayoutEffect(() => {
    if (!flipPendingRef.current) return;
    flipPendingRef.current = false;

    const oldPositions = positionsRef.current;
    if (oldPositions.size === 0) return;

    const els = document.querySelectorAll<HTMLElement>('[data-material-id]');
    els.forEach(el => {
      const id = el.dataset.materialId!;
      if (id === draggedMaterialId) return;

      const oldRect = oldPositions.get(id);
      if (!oldRect) return;

      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = 'none';
      void el.offsetHeight;
      el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
      el.style.transform = '';
    });
  }, [materials, draggedMaterialId]);

  const snapshotPositions = useCallback(() => {
    const map = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>('[data-material-id]').forEach(el => {
      map.set(el.dataset.materialId!, el.getBoundingClientRect());
    });
    positionsRef.current = map;
    flipPendingRef.current = true;
  }, []);

  // ==========================================
  // ドラッグ＆ドロップ処理
  // ==========================================
  const cleanupDrag = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setDraggedMaterialId(null);
    lastDragOverRef.current = null;

    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll<HTMLElement>('[data-material-id]').forEach(el => {
          el.style.transition = '';
          el.style.transform = '';
        });
      }, 250);
    });
  }, []);

  useEffect(() => {
    if (!draggedMaterialId) return;

    const cleanup = () => cleanupDrag();
    document.addEventListener('dragend', cleanup);
    document.addEventListener('drop', cleanup);

    let lastActivityTime = Date.now();
    const trackActivity = () => { lastActivityTime = Date.now(); };
    document.addEventListener('dragover', trackActivity);

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityTime > 500) cleanup();
    }, 200);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('dragend', cleanup);
      document.removeEventListener('drop', cleanup);
      document.removeEventListener('dragover', trackActivity);
    };
  }, [draggedMaterialId, cleanupDrag]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    lastDragOverRef.current = null;
    setTimeout(() => setDraggedMaterialId(id), 0);
  }, []);

  const computeAndApplyReorder = useCallback((
    clientX: number,
    clientY: number,
    overCategoryName: string
  ) => {
    if (!draggedMaterialId) return;

    const container = categoryContainerRefs.current[overCategoryName];
    if (!container) return;

    const allCards = Array.from(container.querySelectorAll<HTMLElement>('[data-material-id]'));
    const cards = allCards.filter(el => el.dataset.materialId !== draggedMaterialId);

    let insertIndex = cards.length;

    if (cards.length > 0) {
      const ROW_THRESHOLD = 10;
      const rows: { cards: HTMLElement[]; minTop: number; maxBottom: number }[] = [];

      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const lastRow = rows[rows.length - 1];
        if (lastRow && Math.abs(rect.top - lastRow.minTop) < ROW_THRESHOLD) {
          lastRow.cards.push(card);
          lastRow.maxBottom = Math.max(lastRow.maxBottom, rect.bottom);
        } else {
          rows.push({ cards: [card], minTop: rect.top, maxBottom: rect.bottom });
        }
      }

      let targetRow: { cards: HTMLElement[] } | null = null;
      let rowStartIndex = 0;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (clientY < row.maxBottom || r === rows.length - 1) {
          targetRow = row;
          rowStartIndex = 0;
          for (let prev = 0; prev < r; prev++) rowStartIndex += rows[prev].cards.length;
          break;
        }
      }

      if (targetRow) {
        let foundInRow = false;
        for (let c = 0; c < targetRow.cards.length; c++) {
          const rect = targetRow.cards[c].getBoundingClientRect();
          if (clientX < rect.left + rect.width / 2) {
            insertIndex = rowStartIndex + c;
            foundInRow = true;
            break;
          }
        }
        if (!foundInRow) insertIndex = rowStartIndex + targetRow.cards.length;
      }
    }

    const last = lastDragOverRef.current;
    if (last?.categoryName === overCategoryName && last?.insertIndex === insertIndex) return;
    lastDragOverRef.current = { categoryName: overCategoryName, insertIndex };

    snapshotPositions();

    setMaterials(prev => {
      const draggedIdx = prev.findIndex(m => m.id === draggedMaterialId);
      if (draggedIdx === -1) return prev;

      const newMaterials = [...prev];
      const draggedItem = { ...newMaterials[draggedIdx] };

      if (draggedItem.categoryName !== overCategoryName) {
        const catInfo = allCategories.find(c => c.name === overCategoryName);
        if (catInfo) {
          draggedItem.categoryId = catInfo.id;
          draggedItem.categoryName = catInfo.name;
          draggedItem.colorCode = catInfo.colorCode;
          draggedItem.categorySortOrder = catInfo.sortOrder;
        } else {
          const sampleItem = newMaterials.find(
            m => m.categoryName === overCategoryName && m.id !== draggedMaterialId
          );
          if (sampleItem) {
            draggedItem.categoryId = sampleItem.categoryId;
            draggedItem.categoryName = sampleItem.categoryName;
            draggedItem.colorCode = sampleItem.colorCode;
            draggedItem.categorySortOrder = sampleItem.categorySortOrder;
          }
        }
      }

      newMaterials.splice(draggedIdx, 1);
      const catItems = newMaterials.filter(m => m.categoryName === overCategoryName);

      if (catItems.length === 0 || insertIndex >= catItems.length) {
        let lastCatGlobalIdx = -1;
        for (let i = newMaterials.length - 1; i >= 0; i--) {
          if (newMaterials[i].categoryName === overCategoryName) { lastCatGlobalIdx = i; break; }
        }

        if (lastCatGlobalIdx === -1) {
          let insertGlobalIdx = newMaterials.length;
          for (let i = 0; i < newMaterials.length; i++) {
            if (newMaterials[i].categorySortOrder > draggedItem.categorySortOrder) { insertGlobalIdx = i; break; }
          }
          newMaterials.splice(insertGlobalIdx, 0, draggedItem);
        } else {
          newMaterials.splice(lastCatGlobalIdx + 1, 0, draggedItem);
        }
      } else {
        const targetItem = catItems[insertIndex];
        const targetGlobalIdx = newMaterials.findIndex(m => m.id === targetItem.id);
        newMaterials.splice(targetGlobalIdx, 0, draggedItem);
      }

      return newMaterials;
    });
  }, [draggedMaterialId, snapshotPositions, allCategories]);

  const handleContainerDragOver = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    overCategoryName: string
  ) => {
    e.preventDefault();
    if (!draggedMaterialId) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      computeAndApplyReorder(clientX, clientY, overCategoryName);
    });
  }, [draggedMaterialId, computeAndApplyReorder]);

  const handleDragEnd = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  // ==========================================
  // 完了ボタン
  // ==========================================
  const sortedCategoryEntries = buildSortedEntries(
    materials,
    isReorderMode ? allCategories : undefined
  );

  const handleReorderModeEnd = async () => {
    if (draggedMaterialId) cleanupDrag();

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
      showSnackbar("並べ替えを保存しました", "success");
    } catch (error) {
      console.error(error);
      showSnackbar("保存中にエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 削除・編集
  // ==========================================

  // カードの削除ボタン → 確認ダイアログを開く
  const handleDelete = (id: string) => {
    setDeleteMaterialId(id);
  };

  // 確認ダイアログで「削除する」→ DB 更新
  const handleConfirmDelete = async () => {
    if (!deleteMaterialId) return;
    const id = deleteMaterialId;
    setDeleteMaterialId(null);

    const { error } = await supabase
      .from('materials')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
      console.error(error);
      showSnackbar("削除に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setMaterials(prev => prev.filter(m => m.id !== id));
    showSnackbar("教材を削除しました", "success");
  };

  const handleEdit = (id: string) => {
    setEditMaterialId(id);
  };

  // ==========================================
  // レンダリング
  // ==========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 4, color: '#333', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
            <MenuBookOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>
            {isReorderMode ? '教材の並べ替え' : '教材管理'}
          </Typography>
        </Box>

        {isReorderMode ? (
          <Button
            variant="contained"
            size="large"
            onClick={handleReorderModeEnd}
            disabled={isSaving}
            disableElevation
            sx={{ borderRadius: '8px', fontWeight: 'bold', px: 4 }}
          >
            {isSaving ? '保存中...' : '完了'}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', alignContent: 'center', gap: isMobile ? 0.3 : 2 }}>
            <Tooltip title="カテゴリや教材の整理">
              <IconButton
                onClick={handleMenuOpen}
                sx={{ color: '#666', borderRadius: '50%', '&:hover': { backgroundColor: '#e0e0e0' } }}
              >
                <FormatListBulletedIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              sx={{ '& .MuiPaper-root': { borderRadius: '12px', minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } }}
            >
              <MenuItem onClick={openCategoryDialog} sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}>
                <ListItemIcon><BookmarksOutlinedIcon fontSize="small" sx={{ color: '#666' }} /></ListItemIcon>
                カテゴリを編集
              </MenuItem>
              <MenuItem onClick={handleReorderModeStart} sx={{ borderRadius: '8px', mx: 1 }}>
                <ListItemIcon><SwapVertOutlinedIcon fontSize="small" sx={{ color: '#666' }} /></ListItemIcon>
                教材を並べ替え
              </MenuItem>
            </Menu>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size={isMobile ? 'small' : 'large'}
              onClick={() => navigate('/materials/add-new-material')}
              sx={{ 
                borderRadius: '5px', 
                boxShadow: 'none', 
                fontWeight: 'bold', 
                px: isMobile ? 1.5 : 3,
                '& .MuiButton-startIcon': {
                  marginRight: isMobile ? '4px' : '8px',
                  marginLeft: isMobile ? '-4px' : '-4px',
                }
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', color: '#999' }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">まだ教材がありません</Typography>
          <Typography variant="body2">右上のボタンから追加してみましょう！</Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: isMobile ? 1 : 1, pr: isMobile ? 1 : 1, pb: isMobile ? 0 : 3, pt: 1 }}>
          <Grid container spacing={isMobile ? 2 : 4} direction="column">
            {sortedCategoryEntries.map(([categoryName, items, catInfo]) => {
              const groupColor = catInfo?.colorCode ?? items[0]?.colorCode ?? '#1A73E8';
              const isEmpty = items.length === 0;

              if (isEmpty && !isReorderMode) return null;

              return (
                <Grid size={12} key={categoryName} sx={{ mb: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', color: '#333', mb: 2, pl: 1.5, borderLeft: `4px solid ${groupColor}` }}
                  >
                    {categoryName}
                  </Typography>

                  <Box
                    ref={(el: HTMLDivElement | null) => { categoryContainerRefs.current[categoryName] = el; }}
                    onDragOver={(e) => isReorderMode && handleContainerDragOver(e, categoryName)}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: isMobile
                        ? 'repeat(3, 1fr)'
                        : 'repeat(auto-fill, 195px)',
                      gap: isMobile ? 1 : 2,
                      ...(isReorderMode && isEmpty && {
                        minHeight: '100px',
                        borderRadius: '12px',
                        border: '2px dashed #ccc',
                        alignItems: 'center',
                        justifyContent: 'center',
                        display: 'flex',
                      }),
                    }}
                  >
                    {isEmpty && isReorderMode && (
                      <Typography variant="body2" sx={{ color: '#bbb', pointerEvents: 'none' }}>
                        ここにドラッグして移動
                      </Typography>
                    )}

                    {items.map(item => {
                      const isDragging = draggedMaterialId === item.id;
                      return (
                        <Box
                          key={item.id}
                          data-material-id={item.id}
                          draggable={isReorderMode}
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          sx={{
                            cursor: isReorderMode ? 'grab' : 'default',
                            opacity: isDragging ? 0.4 : 1,
                            willChange: isReorderMode && !isDragging ? 'transform' : undefined,
                            '&:active': { cursor: isReorderMode ? 'grabbing' : 'default' },
                            ...(isDragging && {
                              borderRadius: '12px',
                              outline: '2px dashed #1A73E8',
                              outlineOffset: '2px',
                            }),
                          }}
                        >
                          <MaterialCard
                            material={item}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            isReorderMode={isReorderMode}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* 教材削除 確認ダイアログ */}
      <ConfirmDialog
        open={deleteMaterialId !== null}
        title="教材を削除しますか？"
        message={
          <>
            <strong>「{deleteMaterialName}」</strong>を削除します。<br />
            削除した教材は元に戻せません。
          </>
        }
        confirmLabel="削除する"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteMaterialId(null)}
      />

      <CategoryEditDialog
        open={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onUpdated={() => fetchMaterials()}
      />

      {/* ★ 追加: 編集ダイアログ */}
      <MaterialEditDialog
        materialId={editMaterialId}
        onClose={() => setEditMaterialId(null)}
        onUpdated={() => {
          fetchMaterials();
          showSnackbar("教材を更新しました", "success");
        }}
      />

      {/* 離脱確認ダイアログ */}
      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        message={'並べ替えの変更が保存されていません。\nこのページを離れると、変更が破棄されます。'}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}