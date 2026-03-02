// src/components/MaterialCard.tsx

import React, { useState } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, IconButton, Menu, MenuItem, ListItemIcon, useMediaQuery, useTheme } from '@mui/material';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';

interface MaterialCardProps {
  material: { id: string; name: string; image: string; };
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  borderColor?: string;
  borderWidth?: number;
  isReorderMode?: boolean;
}

export default function MaterialCard({ material, onDelete, onEdit, borderColor = '#e0e0e0', borderWidth = 1, isReorderMode }: MaterialCardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);
  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(material.id); handleMenuClose(); };
  const handleEditClick = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(material.id); handleMenuClose(); };

return (
  <>
    <Card 
      sx={{ 
        height: isMobile ? '170px' : '260px',
        width: isMobile ? '100%' : '195px',
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: '12px', 
        transition: 'transform 0.2s', 
        '&:hover': { transform: 'translateY(-0.5px)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }, 
        position: 'relative',
        border: `1px solid ${borderColor}`,
        backgroundColor: '#fff'
      }}>
      
      <Box sx={{ 
        height: isMobile ? '105px' : '180px',
        flexShrink: 0,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        pt: isMobile ? 2 : 1.5,
        pb: '0',
        px: isMobile ? 1 : 2,
      }}>
        <CardMedia 
          component="img" 
          sx={{ 
            height: '100%',
            maxHeight: isMobile ? '85px' : '140px',
            width: 'auto',
            maxWidth: '100%', 
            objectFit: 'contain',
          }} 
          image={material.image} 
          alt={material.name} 
        />
      </Box>

      {/* メニューボタン（スマホ時はサイズと配置をコンパクトに） */}
      {isReorderMode ? (
          <IconButton 
            size="small" 
            sx={{ position: 'absolute', top: isMobile ? 2 : 8, right: isMobile ? 2 : 8, color: '#999', cursor: 'grab', pl: isMobile ? 0.5 : 1 }}
          >
            <DragIndicatorOutlinedIcon sx={{ fontSize: isMobile ? '16px' : '20px' }} />
          </IconButton>
        ) : (
          <IconButton 
            size="small" 
            onClick={handleMenuOpen} 
            sx={{ 
              position: 'absolute', 
              top: isMobile ? 0 : 8,   // ギリギリまで上に
              right: isMobile ? 0 : 8, // ギリギリまで右に
              color: '#666', 
              p: isMobile ? '4px' : '8px', // ボタンの余白も削る
              backgroundColor: isMobile ? 'rgba(255,255,255,0.7)' : 'transparent', // 画像と被っても見えるように半透明の白背景
              '&:hover': { backgroundColor: '#e0e0e0' } 
            }}
          >
            <MoreVertOutlinedIcon sx={{ fontSize: isMobile ? '18px' : '20px' }} />
          </IconButton>
        )}

      {/* タイトル部分 */}
      <CardContent sx={{ 
        // 🌟 修正: テキストエリアの余白も削る
        p: isMobile ? '4px 6px !important' : 1.5, 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start' 
      }}>
        <Typography sx={{ 
          fontWeight: 'bold', 
          lineHeight: 1.2, 
          // 🌟 修正: スマホ時はフォントサイズを10pxにし、2行で綺麗に収める
          fontSize: isMobile ? '10px' : '14px', 
          display: '-webkit-box', 
          overflow: 'hidden', 
          WebkitBoxOrient: 'vertical', 
          WebkitLineClamp: isMobile ? 3 : 3,
          height: isMobile ? '36px' : '51px',
        }}>
          {material.name}
        </Typography>
      </CardContent>
    </Card>

    {/* カード専用のメニュー（そのまま） */}
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} onClick={(e) => e.stopPropagation()} sx={{ '& .MuiPaper-root': { borderRadius: '12px', minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } }}>
      <MenuItem onClick={handleEditClick} sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}>
        <ListItemIcon><EditNoteOutlinedIcon fontSize="small" sx={{ color: '#666' }} /></ListItemIcon>編集
      </MenuItem>
      <MenuItem onClick={handleDeleteClick} sx={{ borderRadius: '8px', mx: 1 }}>
        <ListItemIcon><DeleteOutlineIcon fontSize="small" sx={{ color: '#d32f2f' }} /></ListItemIcon><Typography color="error">削除</Typography>
      </MenuItem>
    </Menu>
  </>
);
}