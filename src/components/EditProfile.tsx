// src/components/EditProfile.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, Button,
  CircularProgress, Snackbar, Alert, Divider,
  useMediaQuery, useTheme, alpha, Chip,
  Autocomplete, IconButton,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import OutlinedFlagOutlinedIcon from '@mui/icons-material/OutlinedFlagOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddIcon from '@mui/icons-material/Add';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useBlocker, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';
import { compressImage } from '../lib/compressImage';
import SettingsContent from './SettingsContent';
import {
  GOAL_CATEGORIES,
  GOAL_GROUP_SUGGESTIONS,
  GoalCategory,
} from '../constants/goalGroups';
import defaultAvatarPng from '../assets/defaultAvatarPng.png';

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface UserGoal {
  id: string;
  goalGroup: string;
  goalCategory: GoalCategory | null;
}

interface EditProfileProps {
  onProfileSaved?: () => void;
}

const MAX_GOALS = 5;

export default function EditProfile({ onProfileSaved }: EditProfileProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');

  // 目標リスト
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [savedGoals, setSavedGoals] = useState<UserGoal[]>([]);

  // 新規目標追加フォーム
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory | null>(null);
  const [newGoalGroup, setNewGoalGroup] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedSuccessfullyRef = useRef(false);

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

        const [{ data }, { data: goalsData }] = await Promise.all([
          supabase.from('profiles').select('id, display_name, avatar_url, bio').eq('id', user.id).single(),
          supabase.from('user_goals').select('id, goal_group, goal_category').eq('user_id', user.id).order('created_at', { ascending: true }),
        ]);

        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
        }

        const loadedGoals: UserGoal[] = (goalsData || []).map((g: any) => ({
          id: g.id,
          goalGroup: g.goal_group,
          goalCategory: g.goal_category as GoalCategory | null,
        }));
        setGoals(loadedGoals);
        setSavedGoals(loadedGoals);
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

  const handleAddGoal = () => {
    if (!newGoalCategory || !newGoalGroup.trim()) return;
    setGoals(prev => [...prev, {
      id: `new-${Date.now()}`,
      goalGroup: newGoalGroup.trim(),
      goalCategory: newGoalCategory,
    }]);
    setNewGoalGroup('');
    setNewGoalCategory(null);
    setShowAddForm(false);
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(prev => prev.filter((_, i) => i !== index));
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
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, pendingAvatarFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        newAvatarUrl = urlData.publicUrl;
      }

      const primaryGoal = goals[0] ?? null;
      const profileUpdates: any = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        // profiles.goal_group は先頭目標と同期（Home.tsx の目標タブのため）
        goal_group: primaryGoal?.goalGroup ?? null,
        goal_category: primaryGoal?.goalCategory ?? null,
      };
      if (newAvatarUrl) profileUpdates.avatar_url = newAvatarUrl;

      const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', user.id);
      if (profileError) throw profileError;

      // user_goals を全削除→再挿入で同期
      await supabase.from('user_goals').delete().eq('user_id', user.id);
      if (goals.length > 0) {
        const { error: goalsError } = await supabase.from('user_goals').insert(
          goals.map(g => ({ user_id: user.id, goal_group: g.goalGroup, goal_category: g.goalCategory }))
        );
        if (goalsError) throw goalsError;
      }

      // ref を使って同期的にフラグを立てる（state 更新は非同期なので blocker を ref で制御）
      savedSuccessfullyRef.current = true;
      onProfileSaved?.();
      navigate('/profile');
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

  const isDirty = pendingAvatarFile !== null
    || (profile
      ? displayName !== (profile.display_name || '') || bio !== (profile.bio || '')
      : false)
    || JSON.stringify(goals.map(g => ({ goalGroup: g.goalGroup, goalCategory: g.goalCategory })))
      !== JSON.stringify(savedGoals.map(g => ({ goalGroup: g.goalGroup, goalCategory: g.goalCategory })));

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !savedSuccessfullyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  const avatarSrc = previewAvatarUrl || profile?.avatar_url || undefined;
  const isDark = theme.palette.mode === 'dark';
  const dangerColor = theme.palette.error.main;
  const dangerBorder = alpha(dangerColor, isDark ? 0.3 : 0.25);
  const dangerHoverBg = alpha(dangerColor, isDark ? 0.2 : 0.08);

  const newGoalSuggestions = newGoalCategory ? GOAL_GROUP_SUGGESTIONS[newGoalCategory] : [];

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: 'background.default',
      '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.default} inset !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
        caretColor: theme.palette.text.primary,
        borderRadius: 'inherit',
      },
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', gap: 1 }}>
          <IconButton onClick={() => navigate('/profile')} sx={{ mr: 0.5 }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: isMobile ? '24px' : '28px' } }}>
            <AccountCircleOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>プロフィールを編集</Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
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

          {/* プロフィール基本情報 */}
          <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'center', sm: 'flex-start' }, gap: { xs: 2, sm: 4 } }}>
              <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ position: 'relative', width: 96, height: 96 }}>
                  <Avatar
                    src={avatarSrc || defaultAvatarPng}
                    sx={{ width: 96, height: 96, fontSize: '36px', backgroundColor: 'primary.main', color: (t) => t.palette.common.white }}
                  />
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
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>クリックで変更</Typography>
                    {pendingAvatarFile && <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>未保存</Typography>}
                  </Box>
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5, width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  label="表示名" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth inputProps={{ maxLength: 50 }}
                  helperText={`${displayName.length} / 50`} sx={textFieldSx}
                />
                <TextField
                  label="自己紹介" value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  fullWidth multiline rows={3}
                  inputProps={{ maxLength: 200 }}
                  helperText={`${bio.length} / 200`} sx={textFieldSx}
                />
              </Box>
            </Box>
          </Box>

          {/* 目標 */}
          <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <OutlinedFlagOutlinedIcon sx={{ fontSize: '20px', color: 'primary.main' }} />
              <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>目標</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                同じ目標を持つ人のタイムラインに表示されます（最大{MAX_GOALS}件）
              </Typography>
            </Box>

            {/* 登録済み目標リスト */}
            {goals.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {goals.map((goal, index) => (
                  <Box
                    key={goal.id}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      p: 1.5, borderRadius: '10px',
                      border: '1px solid', borderColor: 'divider',
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <OutlinedFlagOutlinedIcon sx={{ fontSize: '16px', color: 'primary.main', flexShrink: 0 }} />
                      <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: 'text.primary', mr: 0.5 }}>
                        {goal.goalGroup}
                      </Typography>
                      {goal.goalCategory && (
                        <Chip
                          label={GOAL_CATEGORIES.find(c => c.id === goal.goalCategory)?.label ?? ''}
                          size="small"
                          sx={{ height: '20px', fontSize: '11px', backgroundColor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: '4px' }}
                        />
                      )}
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveGoal(index)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' }, flexShrink: 0 }}>
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}

            {/* 追加フォーム */}
            {showAddForm ? (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                  カテゴリ
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {GOAL_CATEGORIES.map((cat) => {
                    const selected = newGoalCategory === cat.id;
                    return (
                      <Chip
                        key={cat.id}
                        label={cat.label}
                        onClick={() => { setNewGoalCategory(selected ? null : cat.id); setNewGoalGroup(''); }}
                        variant={selected ? 'filled' : 'outlined'}
                        color={selected ? 'primary' : 'default'}
                        sx={{
                          fontWeight: selected ? 'bold' : 'normal', borderRadius: '8px',
                          ...(!selected && { borderColor: 'divider', color: 'text.secondary', '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.06), borderColor: 'primary.main', color: 'primary.main' } }),
                        }}
                      />
                    );
                  })}
                </Box>

                {newGoalCategory && (
                  <Autocomplete
                    freeSolo
                    options={newGoalSuggestions}
                    value={newGoalGroup}
                    onInputChange={(_, v) => setNewGoalGroup(v)}
                    onChange={(_, v) => setNewGoalGroup(v || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={
                          newGoalCategory === 'university' ? '志望校を入力' :
                          newGoalCategory === 'qualification' ? '資格名を入力' :
                          newGoalCategory === 'language' ? '目標スコアを入力' : '目標を入力'
                        }
                        helperText="リストにない場合は自由に入力できます"
                        sx={textFieldSx}
                      />
                    )}
                    slotProps={{
                      paper: { sx: { borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: theme.shadows[4], backgroundColor: 'background.paper' } },
                      listbox: { sx: { py: 0.5 } },
                    }}
                  />
                )}

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button onClick={() => { setShowAddForm(false); setNewGoalCategory(null); setNewGoalGroup(''); }} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
                  <Button
                    variant="contained" disableElevation
                    onClick={handleAddGoal}
                    disabled={!newGoalCategory || !newGoalGroup.trim()}
                    sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}
                  >
                    追加
                  </Button>
                </Box>
              </Box>
            ) : (
              goals.length < MAX_GOALS && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setShowAddForm(true)}
                  sx={{ fontWeight: 'bold', borderRadius: '8px', color: 'primary.main' }}
                >
                  目標を追加
                </Button>
              )
            )}

            {goals.length === 0 && !showAddForm && (
              <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: '12px', p: 3, textAlign: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  「目標を追加」から目標を設定できます
                </Typography>
              </Box>
            )}
          </Box>

          {/* アカウント情報 */}
          <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 4 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary', mb: 1.5 }}>アカウント情報</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '14px' }}>メールアドレス</Typography>
              <Typography sx={{ color: 'text.primary', fontSize: '14px', fontWeight: 'bold' }}>{email}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '14px' }}>ユーザーID</Typography>
              <Typography sx={{ color: 'text.disabled', fontSize: '12px', fontFamily: 'monospace' }}>{profile?.id}</Typography>
            </Box>
          </Box>

          <Box>
            <Button
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
              sx={{ color: dangerColor, borderColor: dangerBorder, borderRadius: '12px', fontWeight: 'bold', px: 3, '&:hover': { backgroundColor: dangerHoverBg, borderColor: dangerColor } }}
            >
              ログアウト
            </Button>
          </Box>

          {isMobile && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Divider sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 0.5 }}>
                  <SettingsOutlinedIcon sx={{ fontSize: '18px', color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: '13px', color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>設定</Typography>
                </Box>
                <Divider sx={{ flexGrow: 1 }} />
              </Box>
              <SettingsContent />
            </>
          )}

        </Box>
      )}

      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
