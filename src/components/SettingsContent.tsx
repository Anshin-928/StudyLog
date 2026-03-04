// src/components/SettingsContent.tsx
// Settings.tsx（PC）とProfile.tsx（モバイル）の両方から使い回す設定セクション

import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Box, Typography, Switch, Divider, Button,
  TextField, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, IconButton, useTheme, alpha
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { supabase } from '../lib/supabase';
import { ColorModeContext } from '../App';

// ==========================================
// 共通 UI パーツ
// ==========================================
export function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      backgroundColor: 'background.default',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '16px',
      p: { xs: 2.5, sm: 3 },
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {children}
    </Box>
  );
}

export function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontWeight: 'bold', fontSize: '15px' }}>{label}</Typography>
    </Box>
  );
}

// ==========================================
// アカウント削除ダイアログ
// ==========================================
interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountDialog({ open, onClose, onDeleted }: DeleteAccountDialogProps) {
  const theme = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const CONFIRM_WORD = '削除';
  const isMatch = confirmText === CONFIRM_WORD;

  const touchHandledRef = useRef(false);

  const handleTouchEnd = (e: React.TouchEvent, action: () => void) => {
    if (isDeleting) return;
    touchHandledRef.current = true;
    setTimeout(() => { touchHandledRef.current = false; }, 500);
    const touch = e.changedTouches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top  && touch.clientY <= rect.bottom
    ) action();
  };

  const handleClick = (e: React.MouseEvent, action: () => void) => {
    if (isDeleting || touchHandledRef.current) return;
    action();
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleDelete = async () => {
    if (!isMatch) return;
    setIsDeleting(true);
    setError('');
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      onDeleted();
    } catch {
      setError('削除に失敗しました。時間をおいて再試行してください。');
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: { xs: 1, sm: 2 }, m: { xs: 2, sm: 'auto' } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: '28px' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          アカウントを削除しますか？
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.8, fontSize: { xs: '13px', sm: '14px' } }}>
          アカウントを削除すると、すべての学習記録・教材・プロフィールが
          <strong>完全に削除</strong>され、元に戻すことはできません。
        </Typography>
        <Box sx={{ backgroundColor: 'error.lighter', border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: 2 }}>
          <Typography variant="body2" sx={{ color: 'error.main', mb: 1.2, fontWeight: 500 }}>
            確認のため「<strong>{CONFIRM_WORD}</strong>」と入力してください
          </Typography>
          <TextField
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            size="small"
            fullWidth
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& fieldset': { borderColor: isMatch ? 'error.main' : undefined },
              },
            }}
          />
        </Box>
        {error && (
          <Typography variant="body2" sx={{ color: 'error.main', fontSize: '13px' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, gap: 1 }}>
        <Button
          onTouchEnd={(e) => handleTouchEnd(e, handleClose)}
          onClick={(e) => handleClick(e, handleClose)}
          disabled={isDeleting}
          variant="outlined"
          sx={{ color: 'text.secondary', fontWeight: 'bold', flex: 1, borderRadius: '8px', py: 1, borderColor: 'divider' }}
        >
          キャンセル
        </Button>
        <Button
          onTouchEnd={(e) => { if (isMatch) handleTouchEnd(e, handleDelete); }}
          onClick={(e) => { if (isMatch) handleClick(e, handleDelete); }}
          disabled={!isMatch || isDeleting}
          variant="contained"
          disableElevation
          sx={{
            flex: 1, fontWeight: 'bold', borderRadius: '8px', py: 1,
            backgroundColor: 'error.main',
            color: 'error.contrastText',
            '&:hover': { backgroundColor: 'error.dark' },
            '&.Mui-disabled': { backgroundColor: 'error.lighter', color: 'text.disabled' },
          }}
        >
          {isDeleting ? <CircularProgress size={20} color="inherit" /> : '削除する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 設定セクション本体
// ==========================================
export default function SettingsContent() {
  const theme = useTheme();
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const isDark = mode === 'dark';

  const [isPublic, setIsPublic] = useState(false);
  const [isPublicLoading, setIsPublicLoading] = useState(true);
  const [isPublicSaving, setIsPublicSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles').select('is_public').eq('id', user.id).single();
        if (data) setIsPublic(data.is_public ?? false);
      } catch (e) {
        console.error(e);
      } finally {
        setIsPublicLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePublicToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setIsPublic(newValue);
    setIsPublicSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase
        .from('profiles').update({ is_public: newValue }).eq('id', user.id);
      if (error) throw error;
      showSnackbar(newValue ? 'アカウントを公開しました' : 'アカウントを非公開にしました');
    } catch {
      setIsPublic(!newValue);
      showSnackbar('設定の保存に失敗しました', 'error');
    } finally {
      setIsPublicSaving(false);
    }
  };

  const passwordError = (() => {
    if (newPassword && newPassword.length < 8) return '8文字以上で入力してください';
    if (confirmPassword && newPassword !== confirmPassword) return 'パスワードが一致しません';
    return '';
  })();

  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !passwordError;

  const handleChangePassword = async () => {
    if (!canChangePassword) return;
    setIsChangingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No email');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        showSnackbar('現在のパスワードが正しくありません', 'error');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSnackbar('パスワードを変更しました');
    } catch {
      showSnackbar('パスワードの変更に失敗しました', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end" tabIndex={-1} size="small">
        {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      backgroundColor: theme.palette.background.paper,
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.paper} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: theme.palette.text.primary,
        borderRadius: 'inherit',
      },
    },
  };

  const dangerColor = theme.palette.error.main;
  const dangerBg = alpha(dangerColor, isDark ? 0.12 : 0.05);
  const dangerBorder = alpha(dangerColor, isDark ? 0.3 : 0.25);
  const dangerHoverBg = alpha(dangerColor, isDark ? 0.2 : 0.08);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ダークモード */}
        <SectionCard>
          <SectionTitle icon={<DarkModeOutlinedIcon fontSize="small" />} label="テーマ" />
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 0.4 }}>
                ダークモード
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6 }}>
                {isDark ? '画面を暗いテーマで表示しています' : '画面を明るいテーマで表示しています'}
              </Typography>
            </Box>
            <Switch
              checked={isDark}
              onChange={toggleColorMode}
              color="primary"
              sx={{ flexShrink: 0 }}
            />
          </Box>
        </SectionCard>

        {/* アカウント公開設定 */}
        <SectionCard>
          <SectionTitle icon={<PublicOutlinedIcon fontSize="small" />} label="アカウントの公開設定" />
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, mb: 0.4 }}>
                アカウントを公開する
              </Typography>
              <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {isPublic
                  ? 'すべてのユーザーがあなたの学習記録や教材を見られるようになります。'
                  : 'あなたのアカウントは現在、非公開です。\n学習記録や教材は、あなたが承認したフォロワーにのみ表示されます。'}
              </Typography>
            </Box>
            <Switch
              checked={isPublic}
              onChange={handlePublicToggle}
              disabled={isPublicLoading || isPublicSaving}
              color="primary"
              sx={{ flexShrink: 0 }}
            />
          </Box>
        </SectionCard>

        {/* パスワード変更 */}
        <SectionCard>
          <SectionTitle icon={<LockOutlinedIcon fontSize="small" />} label="パスワードの変更" />
          <Divider />
          <TextField
            label="現在のパスワード"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth size="small" autoComplete="current-password"
            InputProps={{ endAdornment: eyeBtn(showCurrent, () => setShowCurrent(v => !v)) }}
            sx={textFieldSx}
          />
          <TextField
            label="新しいパスワード"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth size="small" autoComplete="new-password" helperText="8文字以上"
            InputProps={{ endAdornment: eyeBtn(showNew, () => setShowNew(v => !v)) }}
            sx={textFieldSx}
          />
          <TextField
            label="新しいパスワード（確認）"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth size="small" autoComplete="new-password"
            error={!!passwordError && confirmPassword.length > 0}
            helperText={confirmPassword.length > 0 ? passwordError : ''}
            InputProps={{ endAdornment: eyeBtn(showConfirm, () => setShowConfirm(v => !v)) }}
            sx={textFieldSx}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained" disableElevation
              disabled={!canChangePassword || isChangingPassword}
              onClick={handleChangePassword}
              sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}
            >
              {isChangingPassword
                ? <CircularProgress size={20} color="inherit" />
                : 'パスワードを変更する'}
            </Button>
          </Box>
        </SectionCard>

        {/* 危険ゾーン */}
        <Box sx={{
          backgroundColor: dangerBg,
          border: '1px solid',
          borderColor: dangerBorder,
          borderRadius: '16px',
          p: { xs: 2.5, sm: 3 },
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <SectionTitle
            icon={<DeleteForeverOutlinedIcon fontSize="small" sx={{ color: `${dangerColor} !important` }} />}
            label="アカウントの削除"
          />
          <Divider sx={{ borderColor: dangerBorder }} />
          <Box sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}>
            <Typography sx={{ fontSize: '13px', color: 'text.secondary', lineHeight: 1.7 }}>
              アカウントを削除すると、すべてのデータが完全に失われます。<br />
              この操作は取り消すことができません。
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DeleteForeverOutlinedIcon />}
              onClick={() => setIsDeleteDialogOpen(true)}
              sx={{
                flexShrink: 0,
                color: dangerColor, borderColor: dangerColor,
                borderRadius: '10px', fontWeight: 'bold', whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: dangerHoverBg, borderColor: dangerColor },
              }}
            >
              アカウントを削除
            </Button>
          </Box>
        </Box>

      </Box>

      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleted={() => {}}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}