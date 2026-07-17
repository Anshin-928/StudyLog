// src/components/Home.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab,
  CircularProgress, useMediaQuery, useTheme, alpha, IconButton,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import OutlinedFlagOutlinedIcon from '@mui/icons-material/OutlinedFlagOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { goalCategoryLabel } from '../constants/goalGroups';
import { fetchLikes, useLikeToggle } from '../hooks/useLikes';
import EditRecordDialog, { EditableEntry } from './EditRecordDialog';
import ConfirmDialog from './ConfirmDialog';
import TimelineItem from './TimelineItem';
import type { TimelineEntry } from './TimelineItem';
import LikersDialog from './LikersDialog';

// ==========================================
// 型定義
// ==========================================
interface MyProfile {
  id: string;
  goalGroup: string | null;
  goalCategory: string | null;
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2, color: 'text.secondary' }}>
      <Box sx={{ fontSize: '56px', opacity: 0.4 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.secondary' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: '260px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {description}
      </Typography>
    </Box>
  );
}

// ==========================================
// メイン
// ==========================================
export default function Home({ onRecordDeleted }: { onRecordDeleted?: () => void }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabIndex, setTabIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [followLogs, setFollowLogs] = useState<TimelineEntry[]>([]);
  const [goalLogs, setGoalLogs] = useState<TimelineEntry[]>([]);
  const [isLoadingFollow, setIsLoadingFollow] = useState(true);
  const [isLoadingGoal, setIsLoadingGoal] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<EditableEntry | null>(null);
  const [likersLogId, setLikersLogId] = useState<string | null>(null);

  const mapLogs = useCallback((logs: any[], profileMap: Record<string, any>, likeCountMap: Record<string, number>, myLikedSet: Set<string>): TimelineEntry[] => {
    return logs.map(row => ({
      id: row.id,
      materialId: row.material_id ?? null,
      userId: row.user_id,
      displayName: profileMap[row.user_id]?.displayName ?? null,
      avatarUrl: profileMap[row.user_id]?.avatarUrl ?? null,
      goalGroup: profileMap[row.user_id]?.goalGroup ?? null,
      goalCategory: profileMap[row.user_id]?.goalCategory ?? null,
      materialName: row.materials?.title ?? null,
      materialImage: row.materials?.image_url ?? null,
      durationMinutes: row.duration_minutes ?? null,
      pages: row.pages ?? null,
      unit: row.materials?.unit ?? null,
      memo: row.memo ?? null,
      imageUrl: row.image_url ?? null,
      studyDatetime: row.study_datetime,
      likeCount: likeCountMap[row.id] ?? 0,
      likedByMe: myLikedSet.has(row.id),
    }));
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data } = await supabase.from('profiles').select('id, goal_group, goal_category').eq('id', user.id).single();
      if (data) {
        setMyProfile({ id: data.id, goalGroup: data.goal_group ?? null, goalCategory: data.goal_category ?? null });
      }
    };
    init();
  }, []);

  const fetchFollowLogs = useCallback(async (userId: string) => {
    setIsLoadingFollow(true);
    try {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted');
      const followingIds = (follows ?? []).map((f: any) => f.following_id);
      setFollowingCount(followingIds.length);
      const targetIds = [userId, ...followingIds];

      const { data: profilesData } = await supabase.from('profiles').select('id, display_name, avatar_url, goal_group, goal_category').in('id', targetIds);
      const profileMap: Record<string, any> = {};
      (profilesData ?? []).forEach((p: any) => {
        profileMap[p.id] = { displayName: p.display_name, avatarUrl: p.avatar_url, goalGroup: p.goal_group, goalCategory: p.goal_category };
      });

      const { data: logs } = await supabase.from('study_logs').select('id, user_id, material_id, study_datetime, duration_minutes, pages, memo, image_url, materials(title, image_url, unit)').in('user_id', targetIds).order('study_datetime', { ascending: false }).limit(40);
      const { countMap, mySet } = await fetchLikes((logs ?? []).map((l: any) => l.id), userId);
      setFollowLogs(mapLogs(logs ?? [], profileMap, countMap, mySet));
    } catch (e) { console.error(e); } finally { setIsLoadingFollow(false); }
  }, [mapLogs]);

  const fetchGoalLogs = useCallback(async (userId: string, goalGroup: string) => {
    setIsLoadingGoal(true);
    try {
      const { data: matchProfiles } = await supabase.from('profiles').select('id, display_name, avatar_url, goal_group, goal_category, is_public').eq('goal_group', goalGroup);
      const eligible = (matchProfiles ?? []).filter(p => p.is_public === true || p.id === userId);
      const profileMap: Record<string, any> = {};
      eligible.forEach(p => { profileMap[p.id] = { displayName: p.display_name, avatarUrl: p.avatar_url, goalGroup: p.goal_group, goalCategory: p.goal_category }; });
      const eligibleIds = eligible.map(p => p.id);
      const { data: logs } = await supabase.from('study_logs').select('id, user_id, material_id, study_datetime, duration_minutes, pages, memo, image_url, materials(title, image_url, unit)').in('user_id', eligibleIds).order('study_datetime', { ascending: false }).limit(50);
      const { countMap, mySet } = await fetchLikes((logs ?? []).map((l: any) => l.id), userId);
      setGoalLogs(mapLogs(logs ?? [], profileMap, countMap, mySet));
    } catch (e) { console.error(e); } finally { setIsLoadingGoal(false); }
  }, [mapLogs]);

  const applyLikeUpdate = useCallback((logId: string, delta: number, likedByMe: boolean) => {
    const update = (list: TimelineEntry[]) => list.map(e => e.id === logId ? { ...e, likeCount: Math.max(0, e.likeCount + delta), likedByMe } : e);
    setFollowLogs(update);
    setGoalLogs(update);
  }, []);
  const toggleLike = useLikeToggle(myId, applyLikeUpdate);
  const handleToggleLike = useCallback((entry: TimelineEntry) => {
    toggleLike(entry.id, entry.likedByMe);
  }, [toggleLike]);

  const handleRefresh = useCallback(() => {
    if (myId) fetchFollowLogs(myId);
    if (myId && myProfile?.goalGroup) fetchGoalLogs(myId, myProfile.goalGroup);
  }, [myId, myProfile, fetchFollowLogs, fetchGoalLogs]);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await supabase.from('study_logs').delete().eq('id', deleteConfirmId);
      handleRefresh();
      onRecordDeleted?.();
    } catch (e) { console.error(e); }
    setDeleteConfirmId(null);
  };

  useEffect(() => { if (myId) fetchFollowLogs(myId); }, [myId, fetchFollowLogs]);
  useEffect(() => {
    if (myId && myProfile?.goalGroup) fetchGoalLogs(myId, myProfile.goalGroup);
    else setIsLoadingGoal(false);
  }, [myId, myProfile, fetchGoalLogs]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* ライトボックス */}
      {lightboxUrl && (
        <Box
          onClick={() => setLightboxUrl(null)}
          sx={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconButton
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setLightboxUrl(null); }}
            sx={{
              position: 'absolute', top: 16, left: 16,
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          <img
            src={lightboxUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </Box>
      )}
      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 4, color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
          <HomeOutlinedIcon />
        </Box>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>ホーム</Typography>
      </Box>

      {/* タブ */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 0 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          TabIndicatorProps={{ sx: { height: 3, borderRadius: '10px 10px 0 0' } }}
        >
          <Tab icon={<PeopleOutlinedIcon sx={{ fontSize: '18px' }} />} iconPosition="start" label="フォロー" sx={{ minHeight: '48px', fontWeight: 'bold', borderRadius: '10px 10px 0 0' }} />
          <Tab icon={<OutlinedFlagOutlinedIcon sx={{ fontSize: '18px' }} />} iconPosition="start" label="目標" sx={{ minHeight: '48px', fontWeight: 'bold', borderRadius: '10px 10px 0 0' }} />
        </Tabs>
      </Box>

      {/* タイムライン */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {tabIndex === 0 ? (
          isLoadingFollow ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>
          ) : followLogs.length === 0 ? (
            <EmptyState icon={<PeopleOutlinedIcon sx={{ fontSize: 'inherit' }} />} title={followingCount === 0 ? "フォロー中のユーザーがいません" : "記録がまだありません"} description="ユーザー検索から他のユーザーをフォローすると&#10;ここに記録が流れてきます" />
          ) : (
            <Box>
              <Box sx={{ mt: 1 }}>
                {followLogs.map(entry => (
                  <TimelineItem key={entry.id} entry={entry}
                    onUserClick={(userId) => navigate(`/users/${userId}`)}
                    onImageClick={setLightboxUrl}
                    isOwn={entry.userId === myId}
                    onEdit={() => setEditEntry(entry)}
                    onDelete={() => setDeleteConfirmId(entry.id)}
                    onToggleLike={handleToggleLike}
                    onShowLikers={setLikersLogId}
                  />
                ))}
              </Box>
            </Box>
          )
        ) : (
          isLoadingGoal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>
          ) : !myProfile?.goalGroup ? (
            <EmptyState icon={<OutlinedFlagOutlinedIcon sx={{ fontSize: 'inherit' }} />} title="目標が設定されていません" description="プロフィール画面から目標を設定すると&#10;同じ目標を持つ人の記録が表示されます" />
          ) : goalLogs.length === 0 ? (
            <EmptyState icon={<OutlinedFlagOutlinedIcon sx={{ fontSize: 'inherit' }} />} title="まだ記録がありません" description={`「${myProfile.goalGroup}」を目指す\n仲間の記録がここに表示されます`} />
          ) : (
            <Box>
              <Box sx={{ mx: 2, mt: 3, mb: 2, px: 2, py: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                <OutlinedFlagOutlinedIcon sx={{ fontSize: '18px', color: 'primary.main' }} />
                <Box>
                  <Typography sx={{ fontWeight: 'bold', fontSize: '13px', color: 'primary.main' }}>{myProfile.goalGroup}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{goalCategoryLabel(myProfile.goalCategory)} · {goalLogs.length}件の記録</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                {goalLogs.map(entry => (
                  <TimelineItem key={entry.id} entry={entry}
                    onUserClick={(userId) => navigate(`/users/${userId}`)}
                    onImageClick={setLightboxUrl}
                    isOwn={entry.userId === myId}
                    onEdit={() => setEditEntry(entry)}
                    onDelete={() => setDeleteConfirmId(entry.id)}
                    onToggleLike={handleToggleLike}
                    onShowLikers={setLikersLogId}
                  />
                ))}
              </Box>
            </Box>
          )
        )}
      </Box>

      {/* いいねしたユーザー一覧 */}
      <LikersDialog
        logId={likersLogId}
        onClose={() => setLikersLogId(null)}
        onUserClick={(userId) => navigate(`/users/${userId}`)}
      />

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={Boolean(deleteConfirmId)}
        title="記録を削除"
        message="この記録を削除してもよろしいですか？削除したデータは元に戻せません。"
        confirmLabel="削除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* 編集ダイアログ */}
      {editEntry && (
        <EditRecordDialog
          open={Boolean(editEntry)}
          onClose={() => setEditEntry(null)}
          entry={editEntry}
          onSaved={() => { setEditEntry(null); handleRefresh(); }}
        />
      )}
    </Box>
  );
}
