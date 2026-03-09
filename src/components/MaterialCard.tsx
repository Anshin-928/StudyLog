// src/components/MaterialCard.tsx

import React, { useState } from 'react';
import { Box, Card, CardMedia, CardContent, Typography, IconButton, Menu, MenuItem, ListItemIcon, useMediaQuery, useTheme, alpha } from '@mui/material';
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
  dragHandleProps?: Record<string, unknown>;
}

export default function MaterialCard({ material, onDelete, onEdit, borderColor = 'divider', borderWidth = 1, isReorderMode, dragHandleProps }: MaterialCardProps) {
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
        '&:hover': { transform: 'translateY(-0.5px)', boxShadow: theme.palette.mode === 'dark' ? '0 6px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)' }, 
        position: 'relative',
        border: `${borderWidth}px solid`,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        ...(isReorderMode && {
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }),
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

      {/* メニューボタン */}
      {isReorderMode ? (
          <Box
            {...(dragHandleProps ?? {})}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
              position: 'absolute', top: isMobile ? 2 : 8, right: isMobile ? 2 : 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, cursor: 'grab', touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          >
            <DragIndicatorOutlinedIcon sx={{ fontSize: isMobile ? '16px' : '20px', color: 'text.disabled' }} />
          </Box>
        ) : (
          <IconButton 
            size="small" 
            onClick={handleMenuOpen} 
            sx={{ 
              position: 'absolute', 
              top: isMobile ? 0 : 8,
              right: isMobile ? 0 : 8,
              color: 'text.secondary', 
              p: isMobile ? '4px' : '8px',
              backgroundColor: isMobile ? alpha(theme.palette.background.paper, 0.7) : 'transparent',
              '&:hover': { backgroundColor: 'action.hover' } 
            }}
          >
            <MoreVertOutlinedIcon sx={{ fontSize: isMobile ? '18px' : '20px' }} />
          </IconButton>
        )}

      {/* タイトル部分 */}
      <CardContent sx={{ 
        p: isMobile ? '4px 6px !important' : 1.5, 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start' 
      }}>
        <Typography sx={{ 
          color: 'text.primary',
          fontWeight: 'bold', 
          lineHeight: 1.2, 
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

    {/* カード専用のメニュー */}
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} onClick={(e) => e.stopPropagation()} sx={{ '& .MuiPaper-root': { borderRadius: '12px', minWidth: '120px', backgroundImage: 'none', boxShadow: theme.palette.mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)' } }}>
      <MenuItem onClick={handleEditClick} sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}>
        <ListItemIcon><EditNoteOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>編集
      </MenuItem>
      <MenuItem onClick={handleDeleteClick} sx={{ borderRadius: '8px', mx: 1 }}>
        <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon><Typography color="error">削除</Typography>
      </MenuItem>
    </Menu>
  </>
);
}