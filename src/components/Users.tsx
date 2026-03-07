// src/components/Users.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, TextField, Avatar, Button,
  CircularProgress, useMediaQuery, useTheme, alpha, Chip,
  InputAdornment, Divider,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TrackChangesOutlinedIcon from '@mui/icons-material/TrackChangesOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import defaultAvatarPng from '../assets/defaultAvatarPng.png';

// ==========================================
// ユーザー行コンポーネント
// ==========================================
function UserRow({
  user, isMe, onToggleFollow, isProcessing, onUserClick,
}: {
  user: any; isMe: boolean; onToggleFollow: any; isProcessing: boolean; onUserClick: (userId: string) => void;
}) {
  const theme = useTheme();
  const avatarLetter = (user.display_name || '?')[0].toUpperCase();

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
        >
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
            <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>
              {user.display_name || 'ユーザー'}
            </Typography>
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
          variant={user.isFollowing ? 'outlined' : 'contained'}
          size="small"
          disabled={isProcessing}
          onClick={() => onToggleFollow(user.id, user.isFollowing)}
          sx={{
            borderRadius: '20px', fontWeight: 'bold', px: 2, minWidth: '90px',
            textTransform: 'none',
            ...(user.isFollowing ? { borderColor: 'divider', color: 'text.secondary' } : {})
          }}
        >
          {isProcessing ? <CircularProgress size={16} color="inherit" /> : user.isFollowing ? 'フォロー中' : 'フォロー'}
        </Button>
      )}
    </Box>
  );
}

export default function Users() {
  const theme = useTheme();
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

      // フォローリストとフォロワー数を一括取得
      const [{ data: myFollows }, { data: followerRows }] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', myId),
        ids.length > 0
          ? supabase.from('follows').select('following_id').in('following_id', ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const followingSet = new Set(myFollows?.map(f => f.following_id));
      const countMap: Record<string, number> = {};
      (followerRows || []).forEach(f => {
        countMap[f.following_id] = (countMap[f.following_id] ?? 0) + 1;
      });

      setUsers((profiles || []).map(p => ({
        ...p,
        isFollowing: followingSet.has(p.id),
        follower_count: countMap[p.id] ?? 0,
      })));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [myId]);

  // myId確定後 + 検索クエリ変化でデバウンス実行
  useEffect(() => {
    if (!myId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(searchQuery), searchQuery ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, myId, fetchUsers]);

  const handleToggleFollow = async (targetId: string, isFollowing: boolean) => {
    setProcessingIds(prev => new Set(prev).add(targetId));
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', targetId);
      } else {
        await supabase.from('follows').insert({ follower_id: myId, following_id: targetId });
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
        sx={{
          mb: 4,
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px', backgroundColor: 'background.paper',
          }
        }}
        InputProps={{
          startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.disabled' }} />
        }}
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