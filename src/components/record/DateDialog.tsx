// src/components/record/DateDialog.tsx
// 日付・時刻選択ダイアログ（Record / EditRecordDialog 共通）

import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import {
  formatDatetime, nowDatetimeLocal, extractDate, extractTime,
  combineDatetime, daysAgo, formatDateLabel,
} from '../../lib/datetimeUtils';

export default function DateDialog({
  open, onClose, value, onChange,
}: {
  open: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    if (open) {
      setLocalDate(extractDate(value));
      setLocalTime(extractTime(value));
    }
  }, [open, value]);

  const quickDates = [
    { label: '今日', value: daysAgo(0) },
    { label: '昨日', value: daysAgo(1) },
  ];

  const handleConfirm = () => {
    onChange(combineDatetime(localDate, localTime));
    onClose();
  };

  const handleNow = () => {
    const now = nowDatetimeLocal();
    setLocalDate(extractDate(now));
    setLocalTime(extractTime(now));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>日付・時刻を選択</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, mt: 1 }}>
          {quickDates.map((qd) => {
            const isActive = localDate === qd.value;
            return (
              <Button
                key={qd.value}
                size="small"
                variant={isActive ? 'contained' : 'outlined'}
                disableElevation
                onClick={() => setLocalDate(qd.value)}
                sx={{
                  flex: 1, borderRadius: '10px', fontWeight: 'bold', fontSize: '13px',
                  py: 0.8,
                  ...(isActive
                    ? {}
                    : { borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', backgroundColor: 'primary.lighter' } }),
                }}
              >
                {qd.label}
              </Button>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          日付
        </Typography>
        <TextField
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          fullWidth size="small"
          slotProps={{
            htmlInput: { style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } },
          }}
          sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
        />
        {localDate && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mb: 2, pl: 0.5 }}>
            {formatDateLabel(localDate)}
          </Typography>
        )}

        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          時刻
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            fullWidth size="small"
            slotProps={{
              htmlInput: { step: 60, style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Button
            size="small" variant="outlined"
            onClick={handleNow}
            sx={{ borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', py: 0.8, px: 1.5, minWidth: 0, whiteSpace: 'nowrap', color: 'text.primary', borderColor: 'divider' }}
          >
            現在
          </Button>
        </Box>

        {localDate && localTime && (
          <Box sx={{ mt: 2.5, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
              {formatDatetime(combineDatetime(localDate, localTime))}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={handleConfirm} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
