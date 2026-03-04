// src/components/ConfirmDialog.tsx

import React, { useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, useTheme
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
  const theme = useTheme();

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
      PaperProps={{ 
        sx: { 
          borderRadius: '20px', 
          p: { xs: 1, sm: 2 }, 
          m: { xs: 2, sm: 'auto' },
          backgroundImage: 'none',
        } 
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: '28px' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' }, color: 'text.primary' }}>
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
          sx={{ 
            color: 'text.secondary', 
            fontWeight: 'bold', 
            flex: 1, 
            borderRadius: '8px', 
            py: 1, 
            borderColor: 'divider' 
          }}
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
            py: 1,
            backgroundColor: 'error.main',
            color: 'error.contrastText',
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}