// src/components/Users.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, Avatar, Button,
  CircularProgress, useTheme, alpha, Chip, Divider,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import defaultAvatarPng from '../assets/defaultAvatarPng.png';

type FollowStatus = 'none' | 'pending' | 'accepted';

// ==========================================
// ユーザー行コンポーネント
// ==========================================
function UserRow({
  user, isMe, onToggleFollow, isProcessing, onUserClick,
}: {
  user: any; isMe: boolean; onToggleFollow: (id: string, status: FollowStatus) => void;
  isProcessing: boolean; onUserClick: (userId: string) => void;
}) {
  const theme = useTheme();
  const status: FollowStatus = user.followStatus ?? 'none';

  const buttonLabel = status === 'accepted' ? 'フォロー中' : status === 'pending' ? '申請中' : (user.is_public ? 'フォロー' : 'フォロー申請');
  const buttonVariant = status === 'none' ? 'contained' : 'outlined';
  const buttonSx = status !== 'none'
    ? { borderColor: 'divider', color: 'text.secondary' }
    : {};

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2, py: 2, px: 2,
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      '&:hover': { backgroundColor: 'action.hover' },
    }}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={() => onUserClick(user.id)}
      >
        <Avatar
          src={user.avatar_url || defaultAvatarPng}
          sx={{ width: 48, height: 48, fontSize: '18px', backgroundColor: 'primary.main', color: 'white', flexShrink: 0 }}
        />

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>
              {user.display_name || 'ユーザー'}
            </Typography>
            {!user.is_public && (
              <LockOutlinedIcon sx={{ fontSize: '14px', color: 'text.disabled' }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {user.goal_group && (
              <Chip
                label={user.goal_group}
                size="small"
                sx={{
                  height: '18px', fontSize: '10px', fontWeight: 'bold',
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main', borderRadius: '4px',
                }}
              />
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
              フォロワー {user.follower_count || 0}人
            </Typography>
          </Box>
        </Box>
      </Box>

      {!isMe && (
        <Button
          variant={buttonVariant}
          size="small"
          disabled={isProcessing}
          onClick={() => onToggleFollow(user.id, status)}
          sx={{ borderRadius: '20px', fontWeight: 'bold', px: 2, minWidth: '90px', textTransform: 'none', ...buttonSx }}
        >
          {isProcessing ? <CircularProgress size={16} color="inherit" /> : buttonLabel}
        </Button>
      )}
    </Box>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMyId(user?.id || null));
  }, []);

  const fetchUsers = useCallback(async (query: string) => {
    if (!myId) return;
    setIsLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, goal_group, is_public')
        .ilike('display_name', `%${query}%`)
        .limit(20);

      const ids = (profiles || []).map(p => p.id);

      // 自分のフォロー状態（status付き）とフォロワー数（accepted のみ）を一括取得
      const [{ data: myFollows }, { data: followerRows }] = await Promise.all([
        supabase.from('follows').select('following_id, status').eq('follower_id', myId),
        ids.length > 0
          ? supabase.from('follows').select('following_id').in('following_id', ids).eq('status', 'accepted')
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const followMap: Record<string, FollowStatus> = {};
      (myFollows || []).forEach(f => { followMap[f.following_id] = f.status as FollowStatus; });

      const countMap: Record<string, number> = {};
      (followerRows || []).forEach(f => {
        countMap[f.following_id] = (countMap[f.following_id] ?? 0) + 1;
      });

      setUsers((profiles || []).map(p => ({
        ...p,
        followStatus: followMap[p.id] ?? 'none',
        follower_count: countMap[p.id] ?? 0,
      })));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [myId]);

  useEffect(() => {
    if (!myId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(searchQuery), searchQuery ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, myId, fetchUsers]);

  const handleToggleFollow = async (targetId: string, currentStatus: FollowStatus) => {
    setProcessingIds(prev => new Set(prev).add(targetId));
    try {
      if (currentStatus !== 'none') {
        // フォロー中 or 申請中 → 解除・キャンセル
        await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', targetId);
      } else {
        // 新規フォロー：相手が非公開なら pending
        const target = users.find(u => u.id === targetId);
        const newStatus = target?.is_public ? 'accepted' : 'pending';
        await supabase.from('follows').insert({ follower_id: myId, following_id: targetId, status: newStatus });
      }
      fetchUsers(searchQuery);
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
    }
  };

  return (
    <Box sx={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, color: 'text.primary' }}>
        <PeopleOutlinedIcon sx={{ mr: 1.5, fontSize: '28px' }} />
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>ユーザーを探す</Typography>
      </Box>

      {/* 検索バー */}
      <TextField
        fullWidth
        placeholder="名前で検索..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.paper' } }}
        slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.disabled' }} /> } }}
      />

      <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          users.map(user => (
            <React.Fragment key={user.id}>
              <UserRow
                user={user}
                isMe={user.id === myId}
                onToggleFollow={handleToggleFollow}
                isProcessing={processingIds.has(user.id)}
                onUserClick={(userId) => navigate(`/users/${userId}`)}
              />
              <Divider />
            </React.Fragment>
          ))
        )}
      </Box>
    </Box>
  );
}
