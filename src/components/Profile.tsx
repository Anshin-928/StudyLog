// src/components/Profile.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, Button,
  CircularProgress, Snackbar, Alert, Divider,
  useMediaQuery, useTheme, alpha
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useBlocker } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';
import { compressImage } from '../lib/compressImage';
import SettingsContent from './SettingsContent';

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface ProfileProps {
  onProfileSaved?: () => void;
}

export default function Profile({ onProfileSaved }: ProfileProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || '');

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPendingAvatarFile(compressed);
    setPreviewAvatarUrl(URL.createObjectURL(compressed));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let newAvatarUrl: string | undefined;

      if (pendingAvatarFile) {
        const fileExt = pendingAvatarFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, pendingAvatarFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        newAvatarUrl = urlData.publicUrl;
      }

      const updates: any = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      };
      if (newAvatarUrl) updates.avatar_url = newAvatarUrl;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName,
        bio,
        ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {}),
      } : null);
      setPendingAvatarFile(null);
      setPreviewAvatarUrl(null);
      onProfileSaved?.();
      showSnackbar('プロフィールを保存しました');
    } catch (e) {
      console.error(e);
      showSnackbar('保存に失敗しました', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isDirty = pendingAvatarFile !== null || (profile
    ? displayName !== (profile.display_name || '') || bio !== (profile.bio || '')
    : false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const avatarSrc = previewAvatarUrl || profile?.avatar_url || undefined;
  const avatarLetter = (displayName || email || '?')[0].toUpperCase();

  // ログアウトボタン用のテーマカラー設定
  const isDark = theme.palette.mode === 'dark';
  const dangerColor = theme.palette.error.main;
  const dangerBorder = alpha(dangerColor, isDark ? 0.3 : 0.25);
  const dangerHoverBg = alpha(dangerColor, isDark ? 0.2 : 0.08);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
            <AccountCircleOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>マイプロフィール</Typography>
        </Box>
        <Button
          variant="contained"
          size='large'
          disableElevation
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          sx={{ borderRadius: '5px', fontWeight: 'bold', px: isMobile ? 2 : 3 }}
        >
          {isSaving ? <CircularProgress size={20} color="inherit" /> : '保存する'}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2 }}>

          {/* プロフィール編集カード */}
          <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' }, gap: { xs: 2, sm: 4 } }}>

              {/* アバター */}
              <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Box sx={{ position: 'relative', width: 96, height: 96 }}>
                  <Avatar
                    src={avatarSrc}
                    sx={{ width: 96, height: 96, fontSize: '36px', backgroundColor: 'primary.main', color: (t) => t.palette.common.white }}
                  >
                    {!avatarSrc && avatarLetter}
                  </Avatar>
                  <Box
                    onClick={() => !isSaving && fileInputRef.current?.click()}
                    sx={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      backgroundColor: 'background.overlay',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isMobile ? 0.7 : 0, transition: 'opacity 0.2s',
                      cursor: isSaving ? 'default' : 'pointer',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <PhotoCameraRoundedIcon sx={{ color: (t) => t.palette.common.white, fontSize: '26px' }} />
                  </Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.4, display: { xs: 'none', sm: 'block' } }}>
                  クリックで変更
                </Typography>
                {pendingAvatarFile && (
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    未保存
                  </Typography>
                )}
              </Box>

              {/* 表示名・自己紹介 */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5, width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  label="表示名"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                  inputProps={{ maxLength: 50 }}
                  helperText={`${displayName.length} / 50`}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.default' } }}
                />
                <TextField
                  label="自己紹介"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  inputProps={{ maxLength: 200 }}
                  helperText={`${bio.length} / 200`}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.default' } }}
                />
              </Box>
            </Box>
          </Box>

          {/* アカウント情報カード */}
          <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary', mb: 1.5 }}>
              アカウント情報
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '14px' }}>メールアドレス</Typography>
              <Typography sx={{ color: 'text.primary', fontSize: '14px', fontWeight: 'bold' }}>{email}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '14px' }}>ユーザーID</Typography>
              <Typography sx={{ color: 'text.disabled', fontSize: '12px', fontFamily: 'monospace' }}>
                {profile?.id}
              </Typography>
            </Box>
          </Box>

          {/* ログアウトボタン */}
          <Box>
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
              sx={{
                color: dangerColor, borderColor: dangerBorder, borderRadius: '12px',
                fontWeight: 'bold', px: 3,
                '&:hover': { backgroundColor: dangerHoverBg, borderColor: dangerColor },
              }}
            >
              ログアウト
            </Button>
          </Box>

          {/* モバイルのみ: 設定セクション */}
          {isMobile && (
            <>
              {/* 区切り線 + 見出し */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 0.5 }}>
                  <SettingsOutlinedIcon sx={{ fontSize: '18px', color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: '13px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    設定
                  </Typography>
                </Box>
                <Divider sx={{ flexGrow: 1 }} />
              </Box>

              {/* 設定セクション本体 */}
              <SettingsContent />
            </>
          )}

        </Box>
      )}

      {/* 離脱確認ダイアログ */}
      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
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
    </Box>
  );
}