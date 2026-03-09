// src/components/Profile.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, Button, Chip,
  CircularProgress, useMediaQuery, useTheme, alpha, IconButton,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemAvatar, ListItemText,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import OutlinedFlagOutlinedIcon from '@mui/icons-material/OutlinedFlagOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';

type FollowStatus = 'none' | 'pending' | 'accepted';
import { supabase } from '../lib/supabase';
import { GOAL_CATEGORIES } from '../constants/goalGroups';
import defaultAvatarPng from '../assets/defaultAvatarPng.png';

// ==========================================
// 型定義
// ==========================================
interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  goal_group: string | null;
  goal_category: string | null;
  is_public: boolean;
}

interface TimelineEntry {
  id: string;
  materialName: string | null;
  materialImage: string | null;
  durationMinutes: number | null;
  pages: number | null;
  unit: string | null;
  memo: string | null;
  imageUrl: string | null;
  studyDatetime: string;
}

// ==========================================
// ユーティリティ
// ==========================================
function formatDuration(mins: number | null): string {
  if (!mins || mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function formatExactTime(isoStr: string): string {
  const d = new Date(isoStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dayStr = days[d.getDay()];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${dayStr}曜日 ${h}:${m}`;
}

function goalCategoryLabel(cat: string | null): string {
  if (!cat) return '';
  return GOAL_CATEGORIES.find(c => c.id === cat)?.label ?? '';
}

// ==========================================
// タイムラインアイテム（単一ユーザー用・ヘッダーなし）
// ==========================================
function TimelineItem({ entry }: { entry: TimelineEntry }) {
  return (
    <Box sx={{
      borderBottom: '1px solid',
      borderColor: 'divider',
      p: { xs: 2, sm: 2.5 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Typography sx={{ fontSize: '12px', color: 'text.disabled', fontWeight: 500 }}>
          {formatExactTime(entry.studyDatetime)}
        </Typography>
      </Box>

      <Box sx={{
        display: 'flex', gap: 2, p: 1.8,
        backgroundColor: 'background.subtle', borderRadius: '12px', border: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {entry.materialImage ? (
            <img
              src={entry.materialImage}
              alt=""
              style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '4px' }}
            />
          ) : (
            <Box sx={{
              height: 80, width: 56, borderRadius: '4px',
              backgroundColor: 'background.default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid', borderColor: 'divider',
            }}>
              <MenuBookOutlinedIcon sx={{ color: 'text.disabled', fontSize: '24px' }} />
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '13.5px', fontWeight: 'bold', color: 'text.primary', mb: 1, lineHeight: 1.3 }}>
            {entry.materialName || '教材なし'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
            {entry.durationMinutes != null && entry.durationMinutes > 0 && (
              <Typography sx={{ fontSize: '22px', fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
                {formatDuration(entry.durationMinutes)}
              </Typography>
            )}
            {entry.pages != null && entry.pages > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                {entry.durationMinutes != null && entry.durationMinutes > 0 && (
                  <Typography sx={{ fontSize: '20px', fontWeight: 'bold', color: 'text.secondary', mx: 0.2 }}>/</Typography>
                )}
                <Typography sx={{ fontSize: '22px', fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
                  {entry.pages}
                </Typography>
                <Typography sx={{ fontSize: '16px', fontWeight: 'bold', color: 'text.secondary' }}>
                  {entry.unit || 'ページ'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {entry.imageUrl && (
        <Box sx={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '240px', border: '1px solid', borderColor: 'divider' }}>
          <img src={entry.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      {entry.memo && (
        <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {entry.memo}
        </Typography>
      )}
    </Box>
  );
}

// ==========================================
// フォローリストダイアログ
// ==========================================
function FollowListDialog({
  open, type, targetUserId, onClose, onUserClick, isOwnProfile, onRemoveFollower,
}: {
  open: boolean;
  type: 'following' | 'followers';
  targetUserId: string;
  onClose: () => void;
  onUserClick: (userId: string) => void;
  isOwnProfile?: boolean;
  onRemoveFollower?: (followerId: string) => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setIsLoading(true);
      setUsers([]);
      try {
        let ids: string[] = [];
        if (type === 'following') {
          const { data } = await supabase.from('follows').select('following_id').eq('follower_id', targetUserId).eq('status', 'accepted');
          ids = (data || []).map(r => r.following_id);
        } else {
          const { data } = await supabase.from('follows').select('follower_id').eq('following_id', targetUserId).eq('status', 'accepted');
          ids = (data || []).map(r => r.follower_id);
        }
        if (ids.length === 0) { setUsers([]); return; }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, goal_group')
          .in('id', ids);
        setUsers(profiles || []);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [open, type, targetUserId]);

  const handleRemove = async (followerId: string) => {
    setUsers(prev => prev.filter(u => u.id !== followerId));
    onRemoveFollower?.(followerId);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '16px' }}>
          {type === 'following' ? 'フォロー中' : 'フォロワー'}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
        ) : users.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ color: 'text.disabled', fontSize: '14px' }}>まだいません</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {users.map(user => (
              <ListItem
                key={user.id}
                disablePadding
                secondaryAction={
                  isOwnProfile && type === 'followers' ? (
                    <IconButton
                      size="small"
                      onClick={() => handleRemove(user.id)}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <PersonRemoveOutlinedIcon fontSize="small" />
                    </IconButton>
                  ) : undefined
                }
              >
                <ListItemButton
                  onClick={() => { onClose(); onUserClick(user.id); }}
                  sx={{ px: 2.5, py: 1.5, pr: isOwnProfile && type === 'followers' ? 7 : 2.5 }}
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatar_url || defaultAvatarPng} sx={{ width: 44, height: 44 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: 'text.primary' }}>
                        {user.display_name || 'ユーザー'}
                      </Typography>
                    }
                    secondary={user.goal_group && (
                      <Typography component="span" sx={{ fontSize: '12px', color: 'text.disabled' }}>
                        {user.goal_group}
                      </Typography>
                    )}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// メイン
// ==========================================
export default function Profile() {
  const { userId: paramUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const [myId, setMyId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [followStatus, setFollowStatus] = useState<FollowStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [userGoals, setUserGoals] = useState<Array<{ id: string; goalGroup: string; goalCategory: string | null }>>([]);
  const [logs, setLogs] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowProcessing, setIsFollowProcessing] = useState(false);
  const [followDialog, setFollowDialog] = useState<{ open: boolean; type: 'following' | 'followers' }>({ open: false, type: 'following' });

  // 自分のIDとターゲットユーザーIDを確定する
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      setTargetUserId(paramUserId || user.id);
    };
    init();
  }, [paramUserId]);

  // フォローリクエスト一覧を取得（自分のプロフィールのみ）
  const fetchPendingRequests = useCallback(async (myUserId: string) => {
    const { data: pendingRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', myUserId)
      .eq('status', 'pending');
    const ids = (pendingRows || []).map(r => r.follower_id);
    if (ids.length === 0) { setPendingRequests([]); return; }
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    setPendingRequests(profiles || []);
  }, []);

  // プロフィール・フォロー情報・学習ログを取得
  const fetchAll = useCallback(async (targetId: string, currentUserId: string) => {
    setIsLoading(true);
    try {
      const [
        { data: profileData },
        { count: followingCount },
        { count: followerCount },
        { data: logsData },
        { data: goalsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', targetId).single(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId).eq('status', 'accepted'),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId).eq('status', 'accepted'),
        supabase.from('study_logs')
          .select('id, study_datetime, duration_minutes, pages, memo, image_url, materials(title, image_url, unit)')
          .eq('user_id', targetId)
          .order('study_datetime', { ascending: false })
          .limit(30),
        supabase.from('user_goals').select('id, goal_group, goal_category').eq('user_id', targetId).order('created_at', { ascending: true }),
      ]);

      if (profileData) setProfile(profileData);
      setFollowCounts({ following: followingCount ?? 0, followers: followerCount ?? 0 });
      setUserGoals((goalsData ?? []).map((g: any) => ({ id: g.id, goalGroup: g.goal_group, goalCategory: g.goal_category })));

      setLogs((logsData ?? []).map((row: any) => ({
        id: row.id,
        materialName: row.materials?.title ?? null,
        materialImage: row.materials?.image_url ?? null,
        durationMinutes: row.duration_minutes ?? null,
        pages: row.pages ?? null,
        unit: row.materials?.unit ?? null,
        memo: row.memo ?? null,
        imageUrl: row.image_url ?? null,
        studyDatetime: row.study_datetime,
      })));

      if (targetId === currentUserId) {
        // 自分のプロフィール：フォローリクエストを取得
        fetchPendingRequests(currentUserId);
      } else {
        // 他人のプロフィール：自分のフォロー状態を確認
        const { data: followData } = await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', currentUserId)
          .eq('following_id', targetId)
          .maybeSingle();
        setFollowStatus(followData ? (followData.status as FollowStatus) : 'none');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPendingRequests]);

  useEffect(() => {
    if (targetUserId && myId) {
      fetchAll(targetUserId, myId);
    }
  }, [targetUserId, myId, fetchAll]);

  const handleToggleFollow = async () => {
    if (!myId || !targetUserId) return;
    setIsFollowProcessing(true);
    try {
      if (followStatus !== 'none') {
        // フォロー中 or 申請中 → 解除・キャンセル
        await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', targetUserId);
        if (followStatus === 'accepted') {
          setFollowCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
        }
        setFollowStatus('none');
      } else {
        // 新規フォロー：相手が非公開なら pending
        const newStatus: FollowStatus = profile?.is_public ? 'accepted' : 'pending';
        await supabase.from('follows').insert({ follower_id: myId, following_id: targetUserId, status: newStatus });
        setFollowStatus(newStatus);
        if (newStatus === 'accepted') {
          setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
        }
      }
    } finally {
      setIsFollowProcessing(false);
    }
  };

  // フォロワーを強制解除（自分のフォロワーリストから）
  const handleRemoveFollower = async (followerId: string) => {
    if (!myId) return;
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', myId);
    setFollowCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
  };

  // フォローリクエストを承認
  const handleApproveRequest = async (followerId: string) => {
    if (!myId) return;
    try {
      const { error } = await supabase
        .from('follows')
        .update({ status: 'accepted' })
        .eq('follower_id', followerId)
        .eq('following_id', myId);
      if (error) throw error;
      setPendingRequests(prev => prev.filter(u => u.id !== followerId));
      setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
    } catch (e) {
      console.error('Approve error:', e);
    }
  };

  // フォローリクエストを拒否
  const handleRejectRequest = async (followerId: string) => {
    if (!myId) return;
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', myId);
      if (error) throw error;
      setPendingRequests(prev => prev.filter(u => u.id !== followerId));
    } catch (e) {
      console.error('Reject error:', e);
    }
  };

  const isOwn = myId !== null && targetUserId === myId;
  const isPrivateAndRestricted = profile !== null && !profile.is_public && !isOwn && followStatus !== 'accepted';
  const avatarLetter = (profile?.display_name || '?')[0]?.toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {targetUserId && (
        <FollowListDialog
          open={followDialog.open}
          type={followDialog.type}
          targetUserId={targetUserId}
          onClose={() => setFollowDialog(prev => ({ ...prev, open: false }))}
          onUserClick={(userId) => navigate(`/users/${userId}`)}
          isOwnProfile={isOwn}
          onRemoveFollower={handleRemoveFollower}
        />
      )}

      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        {paramUserId && (
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 0.5 }}>
            <ArrowBackRoundedIcon />
          </IconButton>
        )}
        <AccountCircleOutlinedIcon sx={{ fontSize: isMobile ? '24px' : '28px', color: 'text.primary' }} />
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>
          {isOwn ? 'マイプロフィール' : 'プロフィール'}
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2 }}>

          {/* フォローリクエスト（自分のプロフィールのみ・pendingがある場合） */}
          {isOwn && pendingRequests.length > 0 && (
            <Box sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', overflow: 'hidden' }}>
              <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonAddOutlinedIcon sx={{ fontSize: '18px', color: 'primary.main' }} />
                <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>
                  フォローリクエスト
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', ml: 0.5 }}>
                  {pendingRequests.length}件
                </Typography>
              </Box>
              <List disablePadding>
                {pendingRequests.map(user => (
                  <ListItem key={user.id} disablePadding sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                    <ListItemButton onClick={() => navigate(`/users/${user.id}`)} sx={{ px: { xs: 2, sm: 3 }, py: 1.5, pr: 14 }}>
                      <ListItemAvatar>
                        <Avatar src={user.avatar_url || defaultAvatarPng} sx={{ width: 40, height: 40 }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: 'text.primary' }}>
                            {user.display_name || 'ユーザー'}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    <Box sx={{ position: 'absolute', right: { xs: 12, sm: 16 }, display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleApproveRequest(user.id)}
                        sx={{ backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' }, width: 32, height: 32 }}
                      >
                        <CheckOutlinedIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleRejectRequest(user.id)}
                        sx={{ border: '1px solid', borderColor: 'divider', color: 'text.secondary', '&:hover': { color: 'error.main', borderColor: 'error.main' }, width: 32, height: 32 }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: '16px' }} />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* プロフィールカード */}
          <Box sx={{
            backgroundColor: 'background.paper',
            border: '1px solid', borderColor: 'divider',
            borderRadius: '16px',
            p: { xs: 3, sm: 4 },
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: { xs: 2.5, sm: 4 },
            }}>

              {/* アバター */}
              <Avatar
                src={profile?.avatar_url || defaultAvatarPng}
                sx={{
                  width: { xs: 80, sm: 96 },
                  height: { xs: 80, sm: 96 },
                  fontSize: { xs: '30px', sm: '36px' },
                  backgroundColor: 'primary.main',
                  color: t => t.palette.common.white,
                  flexShrink: 0,
                }}
              >
              </Avatar>

              {/* 情報エリア */}
              <Box sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                textAlign: { xs: 'center', sm: 'left' },
                width: '100%',
              }}>
                {/* 名前・自己紹介 */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '20px', sm: '22px' }, color: 'text.primary' }}>
                      {profile?.display_name || 'ユーザー'}
                    </Typography>
                    {profile && !profile.is_public && (
                      <LockOutlinedIcon sx={{ fontSize: '18px', color: 'text.disabled' }} />
                    )}
                  </Box>
                  {profile?.bio && (
                    <Typography sx={{ fontSize: '14px', color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {profile.bio}
                    </Typography>
                  )}
                </Box>

                {/* 目標（複数対応） */}
                {userGoals.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: { xs: 'center', sm: 'flex-start' }, alignItems: 'center' }}>
                    <OutlinedFlagOutlinedIcon sx={{ fontSize: '16px', color: 'primary.main', flexShrink: 0 }} />
                    {userGoals.map(goal => (
                      <Chip
                        key={goal.id}
                        label={goal.goalGroup}
                        size="small"
                        sx={{ backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08), color: 'primary.main', fontWeight: 'bold', borderRadius: '6px', fontSize: '12px' }}
                      />
                    ))}
                  </Box>
                )}

                {/* フォロー・フォロワー数 */}
                <Box sx={{ display: 'flex', gap: 3, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Box
                    onClick={() => setFollowDialog({ open: true, type: 'following' })}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                  >
                    <Typography sx={{ fontWeight: 'bold', fontSize: '18px', color: 'text.primary', lineHeight: 1 }}>
                      {followCounts.following}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>フォロー</Typography>
                  </Box>
                  <Box
                    onClick={() => setFollowDialog({ open: true, type: 'followers' })}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                  >
                    <Typography sx={{ fontWeight: 'bold', fontSize: '18px', color: 'text.primary', lineHeight: 1 }}>
                      {followCounts.followers}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>フォロワー</Typography>
                  </Box>
                </Box>

                {/* アクションボタン */}
                <Box sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  {isOwn ? (
                    <Button
                      variant="outlined"
                      startIcon={<EditOutlinedIcon />}
                      onClick={() => navigate('/profile/edit')}
                      sx={{
                        borderRadius: '20px', fontWeight: 'bold', px: 3,
                        textTransform: 'none', borderColor: 'divider', color: 'text.primary',
                        '&:hover': { borderColor: 'primary.main', color: 'primary.main', backgroundColor: alpha(theme.palette.primary.main, 0.04) },
                      }}
                    >
                      プロフィールを編集
                    </Button>
                  ) : (
                    <Button
                      variant={followStatus === 'none' ? 'contained' : 'outlined'}
                      startIcon={followStatus === 'none' ? <PersonAddOutlinedIcon /> : <PersonRemoveOutlinedIcon />}
                      disabled={isFollowProcessing}
                      onClick={handleToggleFollow}
                      sx={{
                        borderRadius: '20px', fontWeight: 'bold', px: 3, textTransform: 'none',
                        ...(followStatus !== 'none' ? { borderColor: 'divider', color: 'text.secondary' } : {}),
                      }}
                    >
                      {isFollowProcessing
                        ? <CircularProgress size={16} color="inherit" />
                        : followStatus === 'accepted' ? 'フォロー中'
                        : followStatus === 'pending' ? '申請中'
                        : profile?.is_public ? 'フォローする' : 'フォロー申請'
                      }
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* 学習記録タイムライン */}
          <Box sx={{
            backgroundColor: 'background.paper',
            border: '1px solid', borderColor: 'divider',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <Box sx={{
              px: { xs: 2, sm: 3 }, py: 2,
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <MenuBookOutlinedIcon sx={{ fontSize: '18px', color: 'text.secondary' }} />
              <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>
                学習記録
              </Typography>
              {!isPrivateAndRestricted && (
                <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.5 }}>
                  {logs.length}件
                </Typography>
              )}
            </Box>

            {isPrivateAndRestricted ? (
              <Box sx={{ py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <LockOutlinedIcon sx={{ fontSize: '48px', color: 'text.disabled', opacity: 0.4 }} />
                <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.secondary' }}>
                  このアカウントは非公開です
                </Typography>
                <Typography sx={{ fontSize: '13px', color: 'text.disabled', textAlign: 'center', maxWidth: '260px', lineHeight: 1.7 }}>
                  フォローすると学習記録を見ることができます
                </Typography>
              </Box>
            ) : logs.length === 0 ? (
              <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <MenuBookOutlinedIcon sx={{ fontSize: '40px', color: 'text.disabled', opacity: 0.4 }} />
                <Typography sx={{ fontSize: '14px', color: 'text.disabled' }}>まだ記録がありません</Typography>
              </Box>
            ) : (
              logs.map(entry => <TimelineItem key={entry.id} entry={entry} />)
            )}
          </Box>

        </Box>
      )}
    </Box>
  );
}
