// src/components/ConfirmDialog.tsx

import React, { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '削除する',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

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
      action(); // 枠内で離した時だけ実行
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
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: '#f50000', fontSize: '28px' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: { xs: '13px', sm: '14px' } }}>
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, gap: 1 }}>
        <Button
          onTouchEnd={(e) => handleTouchEnd(e, onCancel)}
          variant="outlined"
          onClick={(e) => handleClick(e, onCancel)}
          sx={{ color: '#666', fontWeight: 'bold', flex: 1, borderRadius: '8px', py: 1, borderColor: '#e0e0e0' }}
        >
          {cancelLabel}
        </Button>
        <Button
          onTouchEnd={(e) => handleTouchEnd(e, onConfirm)}
          onClick={(e) => handleClick(e, onConfirm)}
          variant="contained"
          disableElevation
          sx={{
            flex: 1,
            fontWeight: 'bold',
            borderRadius: '8px',
            backgroundColor: '#d32f2f',
            py: 1,
            '&:hover': { backgroundColor: '#b71c1c' },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}