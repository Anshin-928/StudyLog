// src/components/Home.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Avatar,
  CircularProgress, useMediaQuery, useTheme, alpha, IconButton,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import OutlinedFlagOutlinedIcon from '@mui/icons-material/OutlinedFlagOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GOAL_CATEGORIES } from '../constants/goalGroups';
import defaultAvatarPng from '../assets/defaultAvatarPng.png';

// ==========================================
// 型定義
// ==========================================
interface TimelineEntry {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  goalGroup: string | null;
  goalCategory: string | null;
  materialName: string | null;
  materialImage: string | null;
  durationMinutes: number | null;
  pages: number | null;
  unit: string | null;
  memo: string | null;
  imageUrl: string | null;
  studyDatetime: string;
}

interface MyProfile {
  id: string;
  goalGroup: string | null;
  goalCategory: string | null;
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
// タイムラインアイテム（Divider区切り形式）
// ==========================================
function TimelineItem({ entry, onUserClick, onImageClick }: { entry: TimelineEntry; onUserClick: (userId: string) => void; onImageClick: (url: string) => void }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const avatarLetter = (entry.displayName || '?')[0].toUpperCase();

  return (
    <Box sx={{
      backgroundColor: 'background.paper',
      borderRadius: '8px',
      borderBottom: '1px solid',
      borderColor: 'divider',
      p: { xs: 2, sm: 2.5 },
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      transition: 'background-color 0.2s',
      '&:hover': { backgroundColor: 'action.hover' },
    }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
          onClick={() => onUserClick(entry.userId)}
        >
          <Avatar
            src={entry.avatarUrl || defaultAvatarPng}
            sx={{ width: 40, height: 40, fontSize: '16px', backgroundColor: 'primary.main', color: t => t.palette.common.white, flexShrink: 0 }}
          >
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: 'text.primary', mb: 0.2 }}>
              {entry.displayName || 'ユーザー'}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '12px', color: 'text.disabled', fontWeight: 500, pt: 0.5, flexShrink: 0 }}>
          {formatExactTime(entry.studyDatetime)}
        </Typography>
      </Box>

      {/* メイン: 教材 + 学習時間 */}
      <Box sx={{
        display: 'flex', gap: 2, p: 1.8,
        backgroundColor: 'background.subtle', borderRadius: '12px', border: '1px solid', borderColor: 'divider'
      }}>
        <Box sx={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {entry.materialImage ? (
            <img 
              src={entry.materialImage} 
              alt="" 
              style={{ height: '100%', width: 'auto', objectFit: 'contain', borderRadius: '2px' }} 
            />
          ) : (
            <Box sx={{ height: 80, width: 56, borderRadius: '2px', backgroundColor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider' }}>
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
        <Box
          onClick={() => onImageClick(entry.imageUrl!)}
          sx={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '240px', border: '1px solid', borderColor: 'divider', mt: 0.5, cursor: 'zoom-in' }}
        >
          <img src={entry.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}

      {entry.memo && (
        <Typography sx={{ fontSize: '14px', color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {entry.memo}
        </Typography>
      )}
    </Box>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2, color: 'text.disabled' }}>
      <Box sx={{ fontSize: '56px', opacity: 0.4 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.secondary' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: '260px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {description}
      </Typography>
    </Box>
  );
}

// ==========================================
// メイン
// ==========================================
export default function Home() {
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

  const mapLogs = useCallback((logs: any[], profileMap: Record<string, any>): TimelineEntry[] => {
    return logs.map(row => ({
      id: row.id,
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
      setFollowLogs(mapLogs(logs ?? [], profileMap));
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
      setGoalLogs(mapLogs(logs ?? [], profileMap));
    } catch (e) { console.error(e); } finally { setIsLoadingGoal(false); }
  }, [mapLogs]);

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
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
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
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2, '& svg': { fontSize: isMobile ? '24px' : '28px' } }}>
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
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {tabIndex === 0 ? (
          isLoadingFollow ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : followLogs.length === 0 ? (
            <EmptyState icon={<PeopleOutlinedIcon sx={{ fontSize: 'inherit' }} />} title={followingCount === 0 ? "フォロー中のユーザーがいません" : "記録がまだありません"} description="ユーザー検索から他のユーザーをフォローすると&#10;ここに記録が流れてきます" />
          ) : (
            <Box>
              <Box sx={{ mt: 1 }}>
                {followLogs.map(entry => <TimelineItem key={entry.id} entry={entry} onUserClick={(userId) => navigate(`/users/${userId}`)} onImageClick={setLightboxUrl} />)}
              </Box>
            </Box>
          )
        ) : (
          isLoadingGoal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
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
                {goalLogs.map(entry => <TimelineItem key={entry.id} entry={entry} onUserClick={(userId) => navigate(`/users/${userId}`)} onImageClick={setLightboxUrl} />)}
              </Box>
            </Box>
          )
        )}
      </Box>
    </Box>
  );
}