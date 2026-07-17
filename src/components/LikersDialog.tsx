// src/components/LikersDialog.tsx
// 「いいねしたユーザー」一覧ダイアログ

import { useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, CircularProgress, IconButton,
  Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemAvatar, ListItemText,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import defaultAvatar from '../assets/defaultAvatar.webp';

export default function LikersDialog({ logId, onClose, onUserClick }: {
  logId: string | null;
  onClose: () => void;
  onUserClick: (userId: string) => void;
}) {
  const theme = useTheme();
  const [likers, setLikers] = useState<{ userId: string; displayName: string | null; avatarUrl: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    const fetchLikers = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('likes')
          .select('user_id, created_at, profiles(display_name, avatar_url)')
          .eq('study_log_id', logId)
          .order('created_at', { ascending: false });
        if (!cancelled) {
          setLikers((data ?? []).map((l: any) => ({
            userId: l.user_id,
            displayName: l.profiles?.display_name ?? null,
            avatarUrl: l.profiles?.avatar_url ?? null,
          })));
        }
      } catch (e) { console.error(e); } finally { if (!cancelled) setIsLoading(false); }
    };
    fetchLikers();
    return () => { cancelled = true; };
  }, [logId]);

  return (
    <Dialog
      open={Boolean(logId)}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '16px',
          backgroundImage: 'none',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 12px rgba(0,0,0,0.1)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', pb: 1 }}>
        いいねしたユーザー
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: '20px' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 1.5, pb: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : likers.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 4, fontSize: '14px', color: 'text.secondary' }}>
            まだいいねがありません
          </Typography>
        ) : (
          <List disablePadding>
            {likers.map(liker => (
              <ListItemButton
                key={liker.userId}
                onClick={() => { onClose(); onUserClick(liker.userId); }}
                sx={{ borderRadius: '10px', px: 1.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 48 }}>
                  <Avatar
                    src={liker.avatarUrl || defaultAvatar}
                    sx={{ width: 36, height: 36, backgroundColor: 'primary.main', color: t => t.palette.common.white }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={liker.displayName || 'ユーザー'}
                  primaryTypographyProps={{ sx: { fontWeight: 'bold', fontSize: '14px' } }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
