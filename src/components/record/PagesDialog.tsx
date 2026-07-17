// src/components/record/PagesDialog.tsx
// 学習量入力ダイアログ（Record / EditRecordDialog 共通）

import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
} from '@mui/material';
import type { PagesData } from '../../types/record';

/** セルに表示する学習量ラベル（未入力なら undefined） */
export function getPagesDisplayValue(pagesData: PagesData, unit: string): string | undefined {
  if (pagesData.mode === 'range' && pagesData.rangeStart && pagesData.rangeEnd) {
    const amount = parseInt(pagesData.rangeEnd) - parseInt(pagesData.rangeStart);
    if (amount >= 0) return `${pagesData.rangeStart} 〜 ${pagesData.rangeEnd}（${amount} ${unit}）`;
  }
  if (pagesData.total && parseInt(pagesData.total) > 0) {
    return `${pagesData.total} ${unit}`;
  }
  return undefined;
}

export default function PagesDialog({
  open, onClose, value, unit, onConfirm,
}: {
  open: boolean; onClose: () => void;
  value: PagesData; unit: string;
  onConfirm: (v: PagesData) => void;
}) {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [localTotal, setLocalTotal] = useState(value.total);
  const [localStart, setLocalStart] = useState(value.rangeStart);
  const [localEnd, setLocalEnd] = useState(value.rangeEnd);

  useEffect(() => {
    if (open) {
      setTabIndex(value.mode === 'range' ? 1 : 0);
      setLocalTotal(value.total);
      setLocalStart(value.rangeStart);
      setLocalEnd(value.rangeEnd);
    }
  }, [open, value]);

  const rangeValid =
    localStart !== '' && localEnd !== '' &&
    parseInt(localEnd) >= parseInt(localStart);

  const rangeHasInput = localStart !== '' || localEnd !== '';
  const rangeAmount = rangeValid ? parseInt(localEnd) - parseInt(localStart) : 0;

  const canConfirm = tabIndex === 0
    ? true
    : (!rangeHasInput || rangeValid);

  const handleConfirm = () => {
    if (tabIndex === 0) {
      onConfirm({ mode: 'total', total: localTotal, rangeStart: '', rangeEnd: '' });
    } else {
      if (rangeHasInput && !rangeValid) return;
      onConfirm({
        mode: 'range',
        total: rangeValid ? String(rangeAmount) : '',
        rangeStart: localStart,
        rangeEnd: localEnd,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習量を入力</DialogTitle>
      <DialogContent>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          sx={{ mb: 2, minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, color: 'text.secondary' } }}
        >
          <Tab label="合計" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
          <Tab label="範囲" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
        </Tabs>

        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <TextField
              type="number" value={localTotal}
              onChange={(e) => setLocalTotal(e.target.value)}
              size="small" fullWidth
              slotProps={{
                htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
            />
            <Typography sx={{ fontWeight: 'bold', color: 'text.secondary', flexShrink: 0 }}>{unit}</Typography>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  開始
                </Typography>
                <TextField
                  type="number" value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 1"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
                />
              </Box>
              <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', mt: 2.5, flexShrink: 0 }}>〜</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  終了
                </Typography>
                <TextField
                  type="number" value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 10"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
                />
              </Box>
            </Box>

            {rangeHasInput && !rangeValid && localStart !== '' && localEnd !== '' && (
              <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                終了は開始以上の数値を入力してください
              </Typography>
            )}

            {rangeValid && rangeAmount > 0 && (
              <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
                  {localStart} 〜 {localEnd}（合計: {rangeAmount} {unit}）
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button
          onClick={handleConfirm}
          variant="contained" disableElevation
          disabled={!canConfirm}
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}
        >
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
