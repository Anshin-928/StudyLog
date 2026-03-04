// src/components/NavigationBlockerDialog.tsx

import React, { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, useMediaQuery, useTheme
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface NavigationBlockerDialogProps {
  open: boolean;
  onProceed: () => void;  // 移動する
  onCancel: () => void;   // キャンセル
  message?: string;
}

export default function NavigationBlockerDialog({
  open,
  onProceed,
  onCancel,
  message = '変更内容が保存されていません。\nこのページを離れると、変更が破棄されます。',
}: NavigationBlockerDialogProps) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const touchHandledRef = useRef(false);

  const handleTouchEnd = (e: React.TouchEvent, action: () => void) => {
    touchHandledRef.current = true;
    setTimeout(() => { touchHandledRef.current = false; }, 500);

    const touch = e.changedTouches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    ) {
      action(); 
    }
  };

  const handleClick = (e: React.MouseEvent, action: () => void) => {
    if (touchHandledRef.current) return;
    action();
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: { xs: 1, sm: 2 }, m: { xs: 2, sm: 'auto' } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningAmberRoundedIcon sx={{ color: '#f57c00', fontSize: '28px' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
          未保存の変更があります
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" sx={{ color: '#666', whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: { xs: '13px', sm: '14px' } }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 1, gap: 1 }}>
        <Button
          onTouchEnd={(e) => handleTouchEnd(e, onCancel)}
          onClick={(e) => handleClick(e, onCancel)}
          variant="outlined"
          sx={{ fontWeight: 'bold', borderRadius: '8px', flex: 1, borderColor: '#e0e0e0', color: '#333', py: 1 }}
        >
          キャンセル
        </Button>
        <Button
          onTouchEnd={(e) => handleTouchEnd(e, onProceed)}
          onClick={(e) => handleClick(e, onProceed)}
          variant="contained"
          color="error"
          disableElevation
          sx={{ fontWeight: 'bold', borderRadius: '8px', flex: 1, py: 1 }}
        >
          破棄して移動
        </Button>
      </DialogActions>
    </Dialog>
  );
}