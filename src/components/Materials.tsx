// src/components/Materials

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Button, CircularProgress, IconButton, Menu, MenuItem, ListItemIcon, Tooltip } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AddIcon from '@mui/icons-material/Add';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SwapVertOutlinedIcon from '@mui/icons-material/SwapVertOutlined';
import CategoryEditDialog from './CategoryEditDialog';

import MaterialCard from './MaterialCard';
import { supabase } from '../lib/supabase';

interface Material {
  id: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
}

export default function Materials() {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }

  const handleMenuClose = () => {
    setAnchorEl(null);
  }

  const openCategoryDialog = () => {
    handleMenuClose();
    setIsCategoryDialogOpen(true);
  }

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          id,
          title,
          image_url,
          categories (
            name,
            color_code
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData: Material[] = data.map((item: any) => ({
          id: item.id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || '#e0e0e0',
        }));
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
  // 　データの仕分けと操作
  // ==========================================
  // カテゴリ名ごとに仕分けする処理
  const groupedMaterials = materials.reduce((acc: Record<string, Material[]>, material) => {
    if (!acc[material.categoryName]) acc[material.categoryName] = [];
    acc[material.categoryName].push(material);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    // 画面上から消す前に、DBのステータスを 'archived' に変更する
    const { error } = await supabase
      .from('materials')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
      alert("削除に失敗しました");
      console.error(error);
      return;
    }

    // DBの更新に成功したら、画面上のリストからも見えなくする
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleEdit = (id: string) => {
    alert(`編集機能は準備中です！（対象ID: ${id}）`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* ヘッダー部分 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
            <MenuBookOutlinedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            教材管理
          </Typography>
        </Box>
          
        <Box sx = {{ display: 'flex', alignContent: 'center', gap: 2}}>
          <Tooltip title="カテゴリや教材の整理">

            <IconButton
              onClick={handleMenuOpen}
              sx={{
                color: '#666',
                borderRadius: '50%',
                '&:hover': { backgroundColor: '#e0e0e0' }
              }}
            >
              <FormatListBulletedIcon/>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{ '& .MuiPaper-root': { borderRadius: '12px', minWidth: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } }}
          >
            <MenuItem onClick={openCategoryDialog} sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}>
              <ListItemIcon><CategoryOutlinedIcon fontSize="small" sx={{ color: '#666' }} /></ListItemIcon>
              カテゴリを編集
            </MenuItem>
            
            <MenuItem onClick={() => { handleMenuClose(); alert("教材の並べ替えモードにします"); }} sx={{ borderRadius: '8px', mx: 1 }}>
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

      </Box>

      {/* ローディング中の表示 */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : materials.length === 0 ? (
        /* 教材が1つもない時の表示 */
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexDirection: 'column', color: '#999' }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">まだ教材がありません</Typography>
          <Typography variant="body2">右上のボタンから追加してみましょう！</Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, px: 1.5, pb: 3, pt: 1 }}>
          <Grid container spacing={4} direction="column">
            {Object.entries(groupedMaterials).map(([categoryName, items]) => {
              // カテゴリの色を取得（カテゴリ内の最初の本の色を借りる）
              const groupColor = items.length > 0 ? items[0].colorCode : '#1A73E8';

              return (
                <Grid size={12} key={categoryName} sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', mb: 2, pl: 1, borderLeft: `4px solid ${groupColor}` }}>
                    {categoryName}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {items.map(item => (
                      <MaterialCard 
                        key={item.id}
                        material={item} 
                        onDelete={handleDelete} 
                        onEdit={handleEdit} 
                        borderColor={item.colorCode} 
                        borderWidth={2}
                      />
                    ))}
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
    </Box>
  );
}