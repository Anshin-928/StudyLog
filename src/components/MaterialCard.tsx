// src/components/MaterialCard.tsx

import React, { useState } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorOutlinedIcon from '@mui/icons-material/DragIndicatorOutlined';

interface MaterialCardProps {
  material: {
    id: string;
    name: string;
    image: string;
  };
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  borderColor?: string;
  borderWidth?: number;
  isReorderMode?: boolean;
}

export default function MaterialCard({ material, onDelete, onEdit, borderColor = '#e0e0e0', borderWidth = 1, isReorderMode }: MaterialCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(material.id);
    handleMenuClose();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(material.id);
    handleMenuClose();
  };

return (
  <>
    <Card 
      sx={{ 
        height: '260px', width: '195px',
        display: 'flex', 
        flexDirection: 'column', 
        borderRadius: '12px', 
        transition: 'transform 0.2s', 
        '&:hover': { 
          transform: 'translateY(-0.5px)', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)' 
        }, 
        position: 'relative',
        border: `0.5px solid rgba(0, 0, 0, 0.2)`
      }}>
      
      <Box sx={{ 
        height: '180px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#ffffff',
        p: 2,
        pt: 3
      }}>
        <CardMedia 
          component="img" 
          sx={{ 
            height: '100%',
            maxHeight: '140px',
            width: 'auto',
            maxWidth: '100%', 
            objectFit: 'contain',
          }} 
          image={material.image} 
          alt={material.name} 
        />
      </Box>

      {/* メニューボタン（モードによってアイコンを切り替える） */}
      {isReorderMode ? (
          <IconButton 
            size="small" 
            sx={{ position: 'absolute', top: 8, right: 8, color: '#999', cursor: 'grab' }}
          >
            <DragIndicatorOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton 
            size="small" 
            onClick={handleMenuOpen} 
            sx={{ position: 'absolute', top: 8, right: 8, color: '#666', '&:hover': { backgroundColor: '#e0e0e0' } }}
          >
            <MoreVertOutlinedIcon fontSize="small" />
          </IconButton>
        )}

      {/* タイトル部分 */}
      <CardContent sx={{ p: 1.5, flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.3, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
          {material.name}
        </Typography>
      </CardContent>
    </Card>

    {/* カード専用のメニュー */}
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