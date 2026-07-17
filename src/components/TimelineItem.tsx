// src/components/TimelineItem.tsx
// タイムラインの勉強記録カード（いいねボタン・アニメーション込み）

import React, { useState, useRef } from 'react';
import {
  Box, Typography, Avatar, IconButton,
  Menu, MenuItem, ListItemIcon, ListItemText, useTheme,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { formatDuration, formatExactTime } from '../lib/datetimeUtils';
import defaultAvatar from '../assets/defaultAvatar.webp';

export interface TimelineEntry {
  id: string;
  materialId: string | null;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  goalGroup: string | null;
  goalCategory: string | null;
  materialName: string | null;
  materialImage: string | null;
  durationMinutes: number | null;
  pages: number | null;
  unit: string | null;
  memo: string | null;
  imageUrl: string | null;
  studyDatetime: string;
  likeCount: number;
  likedByMe: boolean;
}

export default function TimelineItem({ entry, onUserClick, onImageClick, isOwn, onEdit, onDelete, onToggleLike, onShowLikers }: {
  entry: TimelineEntry;
  onUserClick: (userId: string) => void;
  onImageClick: (url: string) => void;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleLike: (entry: TimelineEntry) => void;
  onShowLikers: (logId: string) => void;
}) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [particles, setParticles] = useState<{ id: number; tx: number; ty: number; size: number; color: string; delay: number }[]>([]);
  const [justLiked, setJustLiked] = useState(false);
  const particleId = useRef(0);

  const handleLikeClick = () => {
    if (!entry.likedByMe) {
      // Twitter風: 7方向に等間隔、各方向に色違いの丸を2個ずつ
      const colors = [
        '#66d9a6', '#b39ddb', '#ffb74d', '#f06292', '#64b5f6', '#aed581', '#ff8a80',
        '#9575cd', '#4dd0e1', '#ffd54f', '#81c784', '#f48fb1', '#7986cb', '#ffab91',
      ];
      const spokes = 7;
      setParticles(Array.from({ length: spokes }, (_, i) => {
        const base = (360 / spokes) * i - 90;
        const toXY = (deg: number, dist: number) => {
          const rad = deg * (Math.PI / 180);
          return { tx: Math.cos(rad) * dist, ty: Math.sin(rad) * dist };
        };
        return [
          { id: particleId.current++, ...toXY(base - 9, 26), size: 3.5, color: colors[(2 * i) % colors.length], delay: 0 },
          { id: particleId.current++, ...toXY(base + 9, 20), size: 2.5, color: colors[(2 * i + 1) % colors.length], delay: 50 },
        ];
      }).flat());
      setJustLiked(true);
    }
    onToggleLike(entry);
  };

  return (
    <Box sx={{
      backgroundColor: 'background.paper',
      borderRadius: '8px',
      borderBottom: '1px solid',
      borderColor: 'divider',
      p: { xs: 2, sm: 2.5 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      transition: 'background-color 0.2s',
      '&:hover': { backgroundColor: 'action.hover' },
    }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
          onClick={() => onUserClick(entry.userId)}
        >
          <Avatar
            src={entry.avatarUrl || defaultAvatar}
            sx={{ width: 40, height: 40, fontSize: '16px', backgroundColor: 'primary.main', color: t => t.palette.common.white, flexShrink: 0 }}
          >
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: 'text.primary', mb: 0.2 }}>
              {entry.displayName || 'ユーザー'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontWeight: 500, pt: 0.5 }}>
            {formatExactTime(entry.studyDatetime)}
          </Typography>
          {isOwn && (
            <IconButton size="small" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}>
              <MoreHorizIcon sx={{ fontSize: '18px', color: 'text.secondary' }} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: '12px',
            minWidth: '120px',
            backgroundImage: 'none',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.5)'
              : '0 4px 12px rgba(0,0,0,0.1)',
          }
        }}
      >
        <MenuItem
          onClick={() => { setMenuAnchor(null); onEdit?.(); }}
          sx={{ borderRadius: '8px', mx: 1, mb: 0.5 }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => { setMenuAnchor(null); onDelete?.(); }}
          sx={{ borderRadius: '8px', mx: 1 }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography color="error" sx={{ fontWeight: '500' }}>削除</Typography>
        </MenuItem>
      </Menu>

      {/* メイン: 教材 + 学習時間 */}
      <Box sx={{
        display: 'flex', gap: 2, p: 1.8,
        backgroundColor: 'background.subtle', borderRadius: '12px', border: '1px solid', borderColor: 'divider'
      }}>
        <Box sx={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {entry.materialImage ? (
            <img
              src={entry.materialImage}
              alt=""
              style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '2px' }}
            />
          ) : (
            <Box sx={{ height: 80, width: 56, borderRadius: '2px', backgroundColor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider' }}>
              <MenuBookOutlinedIcon sx={{ color: 'text.secondary', fontSize: '24px' }} />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 'bold', color: 'text.primary', mb: 1, lineHeight: 1.3 }}>
            {entry.materialName || '教材なし'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
            {entry.durationMinutes != null && entry.durationMinutes > 0 && (
              <Typography sx={{ fontSize: '22px', fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
                {formatDuration(entry.durationMinutes)}
              </Typography>
            )}

            {entry.pages != null && entry.pages > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                {entry.durationMinutes != null && entry.durationMinutes > 0 && (
                  <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: 'text.secondary', mx: 0.2 }}>/</Typography>
                )}
                <Typography sx={{ fontSize: '22px', fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
                  {entry.pages}
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.secondary' }}>
                  {entry.unit || 'ページ'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {entry.imageUrl && (
        <Box
          onClick={() => onImageClick(entry.imageUrl!)}
          sx={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '240px', border: '1px solid', borderColor: 'divider', mt: 0.5, cursor: 'zoom-in' }}
        >
          <img src={entry.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      {entry.memo && (
        <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {entry.memo}
        </Typography>
      )}

      {/* いいね */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.3,
        '@keyframes like-burst': {
          '0%': { opacity: 1, transform: 'translate(-50%, -50%) scale(0.5)' },
          '55%': { opacity: 1, transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1)' },
          '100%': { opacity: 0, transform: 'translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3)' },
        },
        '@keyframes like-pop': {
          '0%': { transform: 'scale(0)' },
          '45%': { transform: 'scale(1.35)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
      }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <IconButton
            size="small"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleLikeClick(); }}
            sx={{ color: entry.likedByMe ? 'error.main' : 'text.secondary' }}
          >
            {entry.likedByMe
              ? <FavoriteIcon
                  onAnimationEnd={() => setJustLiked(false)}
                  sx={{ fontSize: '20px', animation: justLiked ? 'like-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}
                />
              : <FavoriteBorderIcon sx={{ fontSize: '20px' }} />}
          </IconButton>
          {particles.map(p => (
            <Box
              key={p.id}
              onAnimationEnd={() => setParticles(cur => cur.filter(c => c.id !== p.id))}
              style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px` } as React.CSSProperties}
              sx={{
                position: 'absolute', top: '50%', left: '50%',
                width: p.size, height: p.size, borderRadius: '50%',
                backgroundColor: p.color, pointerEvents: 'none', opacity: 0,
                animation: `like-burst 700ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms forwards`,
              }}
            />
          ))}
        </Box>
        {entry.likeCount > 0 && (
          <Typography
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onShowLikers(entry.id); }}
            sx={{
              fontSize: '13px', fontWeight: 500,
              color: entry.likedByMe ? 'error.main' : 'text.secondary',
              cursor: 'pointer', px: 0.5, py: 0.3,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {entry.likeCount}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
