// src/components/NavigationBlockerDialog.tsx
// ページ離脱時の確認ダイアログ（useBlocker と組み合わせて使う）

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Box } from '@mui/material';

interface NavigationBlockerDialogProps {
  open: boolean;
  onProceed: () => void;  // 移動する
  onCancel: () => void;   // このページに留まる
  message?: string;
}

export default function NavigationBlockerDialog({
  open,
  onProceed,
  onCancel,
  message = '変更内容が保存されていません。\nこのページを離れると、変更が破棄されます。',
}: NavigationBlockerDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 'bold', pb: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          backgroundColor: '#FFF3E0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <WarningAmberRoundedIcon sx={{ color: '#FF6B00', fontSize: '20px' }} />
        </Box>
        未保存の変更があります
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#666', whiteSpace: 'pre-line', lineHeight: 1.8 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{ fontWeight: 'bold', borderRadius: '8px', flex: 1, borderColor: '#e0e0e0', color: '#333' }}
        >
          このページに留まる
        </Button>
        <Button
          onClick={onProceed}
          variant="contained"
          color="error"
          disableElevation
          sx={{ fontWeight: 'bold', borderRadius: '8px', flex: 1 }}
        >
          破棄して移動
        </Button>
      </DialogActions>
    </Dialog>
  );
}