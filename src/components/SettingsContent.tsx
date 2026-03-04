// src/components/SettingsContent.tsx
// Settings.tsx（PC）とProfile.tsx（モバイル）の両方から使い回す設定セクション

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Switch, Divider, Button,
  TextField, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, IconButton,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { supabase } from '../lib/supabase';

// 共通 UI パーツ
export function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      backgroundColor: '#f8faff',
      border: '1px solid #e8eef8',
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
      <Box sx={{ color: '#1A73E8', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>{label}</Typography>
    </Box>
  );
}

// アカウント削除ダイアログ
interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountDialog({ open, onClose, onDeleted }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const CONFIRM_WORD = '削除';
  const isMatch = confirmText === CONFIRM_WORD;

  // スマホでの誤タップ（ゴーストクリック）防止
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
        <WarningAmberRoundedIcon sx={{ color: '#d32f2f', fontSize: '28px' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          アカウントを削除しますか？
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.8, fontSize: { xs: '13px', sm: '14px' } }}>
          アカウントを削除すると、すべての学習記録・教材・プロフィールが
          <strong>完全に削除</strong>され、元に戻すことはできません。
        </Typography>
        <Box sx={{ backgroundColor: '#fff5f5', border: '1px solid #ffcdd2', borderRadius: '10px', p: 2 }}>
          <Typography variant="body2" sx={{ color: '#d32f2f', mb: 1.2, fontWeight: 500 }}>
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
                backgroundColor: '#fff',
                '& fieldset': { borderColor: isMatch ? '#d32f2f' : '#e0e0e0' },
              },
            }}
          />
        </Box>
        {error && (
          <Typography variant="body2" sx={{ color: '#d32f2f', fontSize: '13px' }}>
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
          sx={{ color: '#666', fontWeight: 'bold', flex: 1, borderRadius: '8px', py: 1, borderColor: '#e0e0e0' }}
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
            backgroundColor: '#d32f2f',
            '&:hover': { backgroundColor: '#b71c1c' },
            '&.Mui-disabled': { backgroundColor: '#ffcdd2', color: '#fff' },
          }}
        >
          {isDeleting ? <CircularProgress size={20} color="inherit" /> : '削除する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 設定セクション本体
export default function SettingsContent() {
  // アカウント公開設定
  const [isPublic, setIsPublic] = useState(false);
  const [isPublicLoading, setIsPublicLoading] = useState(true);
  const [isPublicSaving, setIsPublicSaving] = useState(false);

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // アカウント削除
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  // 公開設定を取得
  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  // 公開設定を保存
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

  // パスワード確認
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

  // パスワード変更
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

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* アカウント公開設定 */}
        <SectionCard>
          <SectionTitle icon={<PublicOutlinedIcon fontSize="small" />} label="アカウントの公開設定" />
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#333', mb: 0.4 }}>
                アカウントを公開する
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                {isPublic
                  ? 'すべてのユーザーがあなたの学習記録や教材を見られるようになります。'
                  : '非公開です。学習記録や教材は、あなたが承認したフォロワーにのみ表示されます。'}
              </Typography>
            </Box>
            <Switch
              checked={isPublic}
              onChange={handlePublicToggle}
              disabled={isPublicLoading || isPublicSaving}
              sx={{
                flexShrink: 0,
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#1A73E8' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1A73E8' },
              }}
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
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
          />
          <TextField
            label="新しいパスワード"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth size="small" autoComplete="new-password" helperText="8文字以上"
            InputProps={{ endAdornment: eyeBtn(showNew, () => setShowNew(v => !v)) }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
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
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
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
          backgroundColor: '#fff5f5',
          border: '1px solid #ffcdd2',
          borderRadius: '16px',
          p: { xs: 2.5, sm: 3 },
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <SectionTitle
            icon={<DeleteForeverOutlinedIcon fontSize="small" sx={{ color: '#d32f2f !important' }} />}
            label="アカウントの削除"
          />
          <Divider sx={{ borderColor: '#ffcdd2' }} />
          <Box sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}>
            <Typography sx={{ fontSize: '13px', color: '#888', lineHeight: 1.7 }}>
              アカウントを削除すると、すべてのデータが完全に失われます。<br />
              この操作は取り消すことができません。
            </Typography>
            <Button
              variant="outlined"
              startIcon={<DeleteForeverOutlinedIcon />}
              onClick={() => setIsDeleteDialogOpen(true)}
              sx={{
                flexShrink: 0,
                color: '#d32f2f', borderColor: '#ffcdd2',
                borderRadius: '10px', fontWeight: 'bold', whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: '#ffeaea', borderColor: '#d32f2f' },
              }}
            >
              アカウントを削除
            </Button>
          </Box>
        </Box>

      </Box>

      {/* アカウント削除ダイアログ */}
      <DeleteAccountDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleted={() => {}}
      />

      {/* Snackbar */}
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