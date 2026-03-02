// src/components/Profile.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, Button,
  CircularProgress, Snackbar, Alert, Divider,
  useMediaQuery, useTheme,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useBlocker } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';
import { compressImage } from '../lib/compressImage';

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

  // 未保存の画像ファイルとプレビューURL
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

  // 画像選択時はstateに保持するだけ（アップロードはまだしない）
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 圧縮だけここで済ませておく
    const compressed = await compressImage(file);
    setPendingAvatarFile(compressed);
    setPreviewAvatarUrl(URL.createObjectURL(compressed));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 「保存する」で画像・表示名・自己紹介をまとめて保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let newAvatarUrl: string | undefined;

      // 画像が選択されていればアップロード
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

  // 画像・表示名・自己紹介のいずれかが変わっていれば保存可能
  const isDirty = pendingAvatarFile !== null || (profile
    ? displayName !== (profile.display_name || '') || bio !== (profile.bio || '')
    : false);

  // 未保存の変更があるとき離脱ブロック
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // 表示するアバター：未保存のプレビュー > 保存済みURL > イニシャル
  const avatarSrc = previewAvatarUrl || profile?.avatar_url || undefined;
  const avatarLetter = (displayName || email || '?')[0].toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '680px', margin: '0 auto', width: '100%' }}>

      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
            <AccountCircleOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold', color: '#333' }}>マイプロフィール</Typography>
        </Box>
        <Button
          variant="contained"
          size='large'
          disableElevation
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          sx={{ 
            borderRadius: '5px', 
            fontWeight: 'bold', 
            px: isMobile ? 2 : 3,
          }}
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
          <Box sx={{ backgroundColor: '#f8faff', border: '1px solid #e8eef8', borderRadius: '16px', p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' }, gap: { xs: 2, sm: 4 } }}>

              {/* アバター */}
              <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                {/* 96x96に固定してオーバーレイが真円になるようにする */}
                <Box sx={{ position: 'relative', width: 96, height: 96 }}>
                  <Avatar
                    src={avatarSrc}
                    sx={{ width: 96, height: 96, fontSize: '36px', backgroundColor: '#1A73E8' }}
                  >
                    {!avatarSrc && avatarLetter}
                  </Avatar>
                  {/* ホバーオーバーレイ */}
                  <Box
                    onClick={() => !isSaving && fileInputRef.current?.click()}
                    sx={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.38)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isMobile ? 0.7 : 0, transition: 'opacity 0.2s',
                      cursor: isSaving ? 'default' : 'pointer',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <PhotoCameraRoundedIcon sx={{ color: '#fff', fontSize: '26px' }} />
                  </Box>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </Box>
                <Typography variant="caption" sx={{ color: '#999', textAlign: 'center', lineHeight: 1.4, display: { xs: 'none', sm: 'block' } }}>
                  クリックで変更
                </Typography>
                {pendingAvatarFile && (
                  <Typography variant="caption" sx={{ color: '#1A73E8', fontWeight: 'bold' }}>
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
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#fff' } }}
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
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#fff' } }}
                />
              </Box>
            </Box>
          </Box>

          {/* アカウント情報カード */}
          <Box sx={{ backgroundColor: '#f8faff', border: '1px solid #e8eef8', borderRadius: '16px', p: 4 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: '#333', mb: 1.5 }}>
              アカウント情報
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: '#888', fontSize: '14px' }}>メールアドレス</Typography>
              <Typography sx={{ color: '#333', fontSize: '14px', fontWeight: 'bold' }}>{email}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: '#888', fontSize: '14px' }}>ユーザーID</Typography>
              <Typography sx={{ color: '#bbb', fontSize: '12px', fontFamily: 'monospace' }}>
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
                color: '#d32f2f', borderColor: '#ffcdd2', borderRadius: '12px',
                fontWeight: 'bold', px: 3,
                '&:hover': { backgroundColor: '#fff5f5', borderColor: '#d32f2f' },
              }}
            >
              ログアウト
            </Button>
          </Box>
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