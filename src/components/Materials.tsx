// src/components/Materials.tsx

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Button, CircularProgress, IconButton, Menu, MenuItem, ListItemIcon, Tooltip,
  Snackbar, Alert
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AddIcon from '@mui/icons-material/Add';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import CategoryEditDialog from './CategoryEditDialog';
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined';

import MaterialCard from './MaterialCard';
import { supabase } from '../lib/supabase';

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

  // allCategories が指定されていれば、空カテゴリも含める
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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedMaterialId, setDraggedMaterialId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 全カテゴリ情報（並べ替え中に空カテゴリを表示するため＆カテゴリ移動時の情報参照用）
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
        .eq('status', 'active');

      if (error) throw error;

      // カテゴリ一覧を別途取得（空カテゴリも含めるため）
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, color_code, sort_order')
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
  //
  // FLIP = First(旧位置) → Last(新位置) → Invert(差分で逆変換) → Play(アニメーション)
  // materials 更新で DOM が変わった直後（描画前）に useLayoutEffect で実行
  // ==========================================
  useLayoutEffect(() => {
    if (!flipPendingRef.current) return;
    flipPendingRef.current = false;

    const oldPositions = positionsRef.current;
    if (oldPositions.size === 0) return;

    const els = document.querySelectorAll<HTMLElement>('[data-material-id]');
    els.forEach(el => {
      const id = el.dataset.materialId!;

      // ドラッグ中のカード自身はアニメーション不要
      if (id === draggedMaterialId) return;

      const oldRect = oldPositions.get(id);
      if (!oldRect) return;

      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      // ① Invert: transition なしで旧位置に瞬間移動
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = 'none';

      // ② リフロー強制（ブラウザに Invert 状態を確定させる）
      void el.offsetHeight;

      // ③ Play: transition 付きで transform を解除 → 新位置へぬるっと移動
      el.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
      el.style.transform = '';
    });
  }, [materials, draggedMaterialId]);

  // ==========================================
  // 全カード位置のスナップショット（state 更新直前に呼ぶ）
  // ==========================================
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

  // ドラッグ状態のクリーンアップ（複数箇所から安全に呼べるように冪等に設計）
  const cleanupDrag = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setDraggedMaterialId(null);
    lastDragOverRef.current = null;

    // FLIP transition の残留スタイルをクリーンアップ
    // transition が完了するまで少し待ってからスタイルを除去
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll<HTMLElement>('[data-material-id]').forEach(el => {
          el.style.transition = '';
          el.style.transform = '';
        });
      }, 250);
    });
  }, []);

  // ドラッグ終了検知: 3 重フォールバック
  //
  // 【問題】カードを別カテゴリへ移動させると、React が元の DOM 要素をアンマウントし
  //  新しい親に再マウントする。ブラウザの dragend イベントは元のソース要素に発火するが、
  //  その要素は既に DOM ツリーから外れているため document にバブルアップしない。
  //
  // 【対策】3 段階のフォールバックでドラッグ終了を確実に検知:
  //  ① document dragend — 同カテゴリ内の並べ替え（DOM 要素が生き残るケース）
  //  ② document drop    — 異カテゴリへの移動（drop ターゲットから document にバブル）
  //  ③ dragover 途絶検知 — ESC キーやウィンドウ外ドロップなどの全エッジケース
  useEffect(() => {
    if (!draggedMaterialId) return;

    const cleanup = () => cleanupDrag();

    // ① dragend: 同カテゴリ内で元 DOM が生きている場合に発火
    document.addEventListener('dragend', cleanup);

    // ② drop: カテゴリコンテナは onDragOver で preventDefault しているので
    //    drop イベントが発火し、document までバブルする
    document.addEventListener('drop', cleanup);

    // ③ dragover 途絶検知:
    //    ドラッグ中は dragover が連続的に発火する（通常 50〜100ms 間隔）。
    //    ドロップ/キャンセルすると途絶するので、一定時間来なければドラッグ終了と判定。
    let lastActivityTime = Date.now();
    const trackActivity = () => { lastActivityTime = Date.now(); };
    document.addEventListener('dragover', trackActivity);

    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityTime > 500) {
        cleanup();
      }
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

  // ------------------------------------------
  // 挿入位置計算＆ state 更新（FLIP 付き）
  // ------------------------------------------
  const computeAndApplyReorder = useCallback((
    clientX: number,
    clientY: number,
    overCategoryName: string
  ) => {
    if (!draggedMaterialId) return;

    const container = categoryContainerRefs.current[overCategoryName];
    if (!container) return;

    // コンテナ内カード（ドラッグ中の自身を除外して位置計算）
    const allCards = Array.from(container.querySelectorAll<HTMLElement>('[data-material-id]'));
    const cards = allCards.filter(el => el.dataset.materialId !== draggedMaterialId);

    // ------------------------------------------
    // 2D flex-wrap グリッドでの挿入インデックス計算
    // ------------------------------------------
    let insertIndex = cards.length; // デフォルト: 末尾

    if (cards.length > 0) {
      // ① カードを行ごとにグループ化
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

      // ② カーソルの Y 座標で対象行を特定
      let targetRow: { cards: HTMLElement[] } | null = null;
      let rowStartIndex = 0;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];

        // カーソルがこの行の下端以内、または最終行ならこの行が対象
        if (clientY < row.maxBottom || r === rows.length - 1) {
          targetRow = row;
          rowStartIndex = 0;
          for (let prev = 0; prev < r; prev++) rowStartIndex += rows[prev].cards.length;
          break;
        }
      }

      // ③ 行内の X 座標で挿入位置を特定
      if (targetRow) {
        let foundInRow = false;
        for (let c = 0; c < targetRow.cards.length; c++) {
          const rect = targetRow.cards[c].getBoundingClientRect();
          const cardMidX = rect.left + rect.width / 2;
          if (clientX < cardMidX) {
            insertIndex = rowStartIndex + c;
            foundInRow = true;
            break;
          }
        }
        if (!foundInRow) {
          insertIndex = rowStartIndex + targetRow.cards.length;
        }
      }
    }

    // 同じ位置への重複更新を防止（jitter 対策）
    const last = lastDragOverRef.current;
    if (last?.categoryName === overCategoryName && last?.insertIndex === insertIndex) return;
    lastDragOverRef.current = { categoryName: overCategoryName, insertIndex };

    // FLIP: 位置スナップショット → state 更新
    snapshotPositions();

    setMaterials(prev => {
      const draggedIdx = prev.findIndex(m => m.id === draggedMaterialId);
      if (draggedIdx === -1) return prev;

      const newMaterials = [...prev];
      const draggedItem = { ...newMaterials[draggedIdx] };

      // 別カテゴリへの移動: カテゴリ情報を更新
      if (draggedItem.categoryName !== overCategoryName) {
        // allCategories から正確な情報を取得（空カテゴリでも対応可能）
        const catInfo = allCategories.find(c => c.name === overCategoryName);
        if (catInfo) {
          draggedItem.categoryId = catInfo.id;
          draggedItem.categoryName = catInfo.name;
          draggedItem.colorCode = catInfo.colorCode;
          draggedItem.categorySortOrder = catInfo.sortOrder;
        } else {
          // フォールバック: 同カテゴリの既存アイテムからコピー
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

      // 元の位置から削除
      newMaterials.splice(draggedIdx, 1);

      // 対象カテゴリ内の現在のアイテム一覧（削除後）
      const catItems = newMaterials.filter(m => m.categoryName === overCategoryName);

      if (catItems.length === 0 || insertIndex >= catItems.length) {
        // カテゴリ末尾に追加
        let lastCatGlobalIdx = -1;
        for (let i = newMaterials.length - 1; i >= 0; i--) {
          if (newMaterials[i].categoryName === overCategoryName) {
            lastCatGlobalIdx = i;
            break;
          }
        }

        if (lastCatGlobalIdx === -1) {
          // このカテゴリにアイテムが 0 個:
          // categorySortOrder に基づいてグローバル配列内の適切な位置に挿入
          let insertGlobalIdx = newMaterials.length;
          for (let i = 0; i < newMaterials.length; i++) {
            if (newMaterials[i].categorySortOrder > draggedItem.categorySortOrder) {
              insertGlobalIdx = i;
              break;
            }
          }
          newMaterials.splice(insertGlobalIdx, 0, draggedItem);
        } else {
          newMaterials.splice(lastCatGlobalIdx + 1, 0, draggedItem);
        }
      } else {
        // 指定インデックスのアイテムの直前に挿入
        const targetItem = catItems[insertIndex];
        const targetGlobalIdx = newMaterials.findIndex(m => m.id === targetItem.id);
        newMaterials.splice(targetGlobalIdx, 0, draggedItem);
      }

      return newMaterials;
    });
  }, [draggedMaterialId, snapshotPositions, allCategories]);

  // ------------------------------------------
  // コンテナ全体の onDragOver → rAF で 1 フレーム 1 回に制限
  // ------------------------------------------
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

  // ------------------------------------------
  // ドラッグ終了（React の onDragEnd から呼ばれるが、
  // 要素がアンマウントされた場合は document listener が代わりに発火）
  // ------------------------------------------
  const handleDragEnd = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  // ==========================================
  // 完了ボタン: sort_order と category_id を一括保存
  // ==========================================
  const sortedCategoryEntries = buildSortedEntries(
    materials,
    isReorderMode ? allCategories : undefined
  );

  const handleReorderModeEnd = async () => {
    // 安全策: ドラッグ状態が残っていたらクリア
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
  const handleDelete = async (id: string) => {
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
    showSnackbar("編集機能は準備中です！", "info");
  };

  // ==========================================
  // レンダリング
  // ==========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
            <MenuBookOutlinedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
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
            sx={{ borderRadius: '8px', fontWeight: 'bold', px: 4, backgroundColor: '#1A73E8' }}
          >
            {isSaving ? '保存中...' : '完了'}
          </Button>
        ) : (
          <Box sx={{ display: 'flex', alignContent: 'center', gap: 2 }}>
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
              size="large"
              onClick={() => navigate('/materials/add-new-material')}
              sx={{ borderRadius: '5px', boxShadow: 'none', fontWeight: 'bold', px: 3 }}
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
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, px: 1.5, pb: 3, pt: 1 }}>
          <Grid container spacing={4} direction="column">
            {sortedCategoryEntries.map(([categoryName, items, catInfo]) => {
              const groupColor = catInfo?.colorCode ?? items[0]?.colorCode ?? '#1A73E8';
              const isEmpty = items.length === 0;

              // 通常モードでは空カテゴリを非表示
              if (isEmpty && !isReorderMode) return null;

              return (
                <Grid size={12} key={categoryName} sx={{ mb: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 'bold', color: '#333', mb: 2, pl: 1, borderLeft: `4px solid ${groupColor}` }}
                  >
                    {categoryName}
                  </Typography>

                  {/* カードコンテナ */}
                  <Box
                    ref={(el: HTMLDivElement | null) => { categoryContainerRefs.current[categoryName] = el; }}
                    onDragOver={(e) => isReorderMode && handleContainerDragOver(e, categoryName)}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      ...(isReorderMode && isEmpty && {
                        minHeight: '100px',
                        borderRadius: '12px',
                        border: '2px dashed #ccc',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                            // ドラッグ中のカードの現在位置を青い点線で囲む（ドロップ先プレビュー）
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
                            borderColor={item.colorCode}
                            borderWidth={2}
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

      <CategoryEditDialog
        open={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onUpdated={() => fetchMaterials()}
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