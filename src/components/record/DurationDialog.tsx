// src/components/record/DurationDialog.tsx
// 学習時間入力ダイアログ（Record / EditRecordDialog 共通）

import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import { formatDuration } from '../../lib/datetimeUtils';

export default function DurationDialog({
  open, onClose, hours, minutes, onConfirm,
}: {
  open: boolean; onClose: () => void;
  hours: string; minutes: string;
  onConfirm: (h: string, m: string) => void;
}) {
  const theme = useTheme();
  const [localH, setLocalH] = useState(hours);
  const [localM, setLocalM] = useState(minutes);
  useEffect(() => { if (open) { setLocalH(hours); setLocalM(minutes); } }, [open, hours, minutes]);

  const total = (parseInt(localH || '0') * 60) + parseInt(localM || '0');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習時間を入力</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <TextField
            type="number" value={localH}
            onChange={(e) => setLocalH(e.target.value)}
            size="small" label="時間"
            slotProps={{
              htmlInput: { min: 0, max: 24, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', flexShrink: 0 }}>:</Typography>
          <TextField
            type="number" value={localM}
            onChange={(e) => setLocalM(e.target.value)}
            size="small" label="分"
            slotProps={{
              htmlInput: { min: 0, max: 59, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
        </Box>
        {total > 0 && (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
              合計 {formatDuration(total)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={() => { onConfirm(localH, localM); onClose(); }} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
