// src/components/Profile.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, Button,
  CircularProgress, Snackbar, Alert, Divider,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { supabase } from '../lib/supabase';

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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // アバター画像アップロード
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      // キャッシュバスター付きURLをローカル表示用に使う
      const avatarUrlWithCache = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrlWithCache } : null);
      onProfileSaved?.();
      showSnackbar('プロフィール画像を更新しました');
    } catch (e) {
      console.error(e);
      showSnackbar('画像のアップロードに失敗しました', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 表示名・自己紹介を保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;

      setProfile(prev => prev ? { ...prev, display_name: displayName, bio } : null);
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

  // 変更があるかどうか（保存ボタンの活性制御）
  const isDirty = profile
    ? displayName !== (profile.display_name || '') || bio !== (profile.bio || '')
    : false;

  const avatarLetter = (displayName || email || '?')[0].toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '680px', margin: '0 auto', width: '100%' }}>

      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: '32px' } }}>
            <AccountCircleOutlinedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>マイプロフィール</Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          disableElevation
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          sx={{ borderRadius: '5px', fontWeight: 'bold', px: 3 }}
        >
          {isSaving ? <CircularProgress size={20} color="inherit" /> : '保存する'}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* プロフィール編集カード */}
          <Box sx={{ backgroundColor: '#f8faff', border: '1px solid #e8eef8', borderRadius: '16px', p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>

              {/* アバター（クリックでアップロード） */}
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  sx={{ width: 96, height: 96, fontSize: '36px', backgroundColor: '#1A73E8', cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!profile?.avatar_url && avatarLetter}
                </Avatar>
                {/* ホバーオーバーレイ */}
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.38)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer',
                    '&:hover': { opacity: 1 },
                  }}
                >
                  {isUploading
                    ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                    : <PhotoCameraRoundedIcon sx={{ color: '#fff', fontSize: '26px' }} />
                  }
                </Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </Box>

              {/* 表示名・自己紹介 */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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