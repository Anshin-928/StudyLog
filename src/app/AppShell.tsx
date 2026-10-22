// src/app/AppShell.tsx

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Chip,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

import { supabase, getSessionUser } from '../lib/supabase';
import { calcStreakFromDates } from '../features/streak/streak';
import defaultAvatar from '../assets/defaultAvatar.webp';
import Sidebar from './Sidebar';
import StreakDialog from '../features/streak/StreakDialog';
import { lazyWithReload } from '../lib/lazyWithReload';
import { AppCallbacksContext } from './contexts';
import type { AppCallbacksContextType } from './contexts';
import { FullScreenLoader, PageLoader } from './RouteFallbacks';

// 未ログインのときだけ表示するので、ほかの画面と同じくコード分割する（src/app/router.tsx）
const LandingPage = lazyWithReload(() => import('../features/landing/LandingPage'));

// ==========================================
// ボトムナビゲーション（スマホ専用）
// ==========================================
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const bottomNavItems: NavItem[] = [
  { label: 'ホーム', path: '/home', icon: <HomeOutlinedIcon /> },
  { label: '記録する', path: '/record', icon: <ModeEditOutlineOutlinedIcon /> },
  { label: 'レポート', path: '/report', icon: <BarChartOutlinedIcon /> },
  { label: '教材', path: '/materials', icon: <MenuBookOutlinedIcon /> },
  { label: '設定', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const currentPath =
    bottomNavItems.find((item) => location.pathname.startsWith(item.path))?.path || false;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={currentPath}
        onChange={(_event, newValue: string) => navigate(newValue)}
        sx={{ backgroundColor: 'transparent', height: 56 }}
      >
        {bottomNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            value={item.path}
            label={item.label}
            icon={item.icon}
            showLabel
            onTouchStart={() => navigate(item.path)}
            sx={{
              minWidth: 0,
              color: theme.palette.text.disabled,
              borderRadius: '20px',
              m: '4px',
              p: '4px',
              '&.Mui-selected': { color: theme.palette.primary.main },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '10px',
                '&.Mui-selected': { fontSize: '10px' },
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}

// ==========================================
// AppShell
// ==========================================
interface ProfileData {
  display_name: string;
  avatar_url: string | null;
}

export default function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [isStudiedToday, setIsStudiedToday] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: '',
    avatar_url: null,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchStreak = useCallback(async () => {
    const user = await getSessionUser();
    if (!user) return;
    const { data } = await supabase
      .from('study_logs')
      .select('study_datetime')
      .eq('user_id', user.id);
    if (data) {
      const isoDates = data.map((d: { study_datetime: string }) => d.study_datetime);
      setStreak(calcStreakFromDates(isoDates));
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const today = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
      setIsStudiedToday(
        isoDates.some((iso) => {
          const d = new Date(iso);
          return (
            new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) ===
            today
          );
        }),
      );
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const user = await getSessionUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single();
    if (data)
      setProfileData({
        display_name: data.display_name || '',
        avatar_url: data.avatar_url || null,
      });
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchStreak();
    fetchProfile();
  }, [session, fetchStreak, fetchProfile]);

  const callbacks = useMemo<AppCallbacksContextType>(
    () => ({
      onRecordSaved: fetchStreak,
      onProfileSaved: fetchProfile,
    }),
    [fetchStreak, fetchProfile],
  );

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  if (session === undefined) return <FullScreenLoader />;

  if (session === null) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <LandingPage />
      </Suspense>
    );
  }

  return (
    <AppCallbacksContext.Provider value={callbacks}>
      <Box
        sx={{
          display: 'flex',
          height: '100dvh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: isMobile
              ? theme.palette.background.paper
              : theme.palette.background.default,
            color: theme.palette.text.primary,
            boxShadow: isMobile ? `0 1px 0 ${theme.palette.divider}` : 'none',
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: isMobile ? '12px' : '16px',
              minHeight: isMobile ? '52px !important' : '64px !important',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: isMobile ? 1 : 0 }}>
              {!isMobile && (
                <IconButton
                  onClick={toggleSidebar}
                  edge="start"
                  sx={{ ml: 0, mr: 2, color: theme.palette.text.primary }}
                >
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Box
                sx={{ display: 'flex', alignItems: 'center', width: isMobile ? 'auto' : '230px' }}
              >
                <img
                  src={theme.palette.mode === 'dark' ? studyLogLogoDark : studyLogLogo}
                  alt="StudyLog"
                  style={{ height: isMobile ? '30px' : '32px', marginRight: '8px' }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: '900',
                    fontSize: isMobile ? '20px' : '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  StudyLog
                </Typography>
              </Box>
            </Box>

            {!isMobile && <Box sx={{ flexGrow: 1 }} />}

            <Chip
              icon={<LocalFireDepartmentRoundedIcon />}
              label={`${streak}`}
              onClick={() => setIsStreakOpen(true)}
              sx={{
                fontWeight: 'bold',
                fontSize: isMobile ? '13px' : '16px',
                px: 0.5,
                py: isMobile ? 1.5 : 2,
                backgroundColor:
                  streak > 0 && isStudiedToday
                    ? theme.palette.streak.lighter
                    : theme.palette.action.hover,
                color:
                  streak > 0 && isStudiedToday
                    ? theme.palette.streak.main
                    : theme.palette.text.disabled,
                border:
                  streak > 0 && isStudiedToday
                    ? `1px solid ${theme.palette.streak.border}`
                    : `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                transition: '0.2s',
                '&:hover': {
                  backgroundColor:
                    streak > 0 && isStudiedToday
                      ? theme.palette.streak.lighter
                      : theme.palette.action.selected,
                  opacity: 0.8,
                },
                '& .MuiChip-icon': {
                  color:
                    streak > 0 && isStudiedToday
                      ? `${theme.palette.streak.main} !important`
                      : theme.palette.text.disabled,
                },
                mr: 1,
              }}
            />

            <IconButton component={Link} to="/profile" sx={{ p: 0.5 }}>
              <Avatar
                src={profileData.avatar_url || defaultAvatar}
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: '15px',
                  fontWeight: 'bold',
                  backgroundColor: theme.palette.primary.main,
                  border: `2px solid ${theme.palette.primary.lighter}`,
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: theme.palette.primary.main },
                }}
              />
            </IconButton>
          </Toolbar>
        </AppBar>

        {!isMobile && <Sidebar isSidebarOpen={isSidebarOpen} />}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            pb: isMobile ? 0 : 2,
            pr: isMobile ? 0 : 2,
            transition: 'margin-left 0.2s',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <Toolbar sx={{ minHeight: isMobile ? '52px !important' : '64px !important' }} />
          <Box
            sx={{
              backgroundColor: theme.palette.background.paper,
              flexGrow: 1,
              borderRadius: isMobile ? 0 : '24px',
              boxShadow: isMobile
                ? 'none'
                : theme.palette.mode === 'dark'
                  ? 'none'
                  : theme.customShadows.sm,
              overflowX: 'hidden',
              overflowY: 'auto',
              p: isMobile ? 2 : 4,
              display: 'flex',
              flexDirection: 'column',
              pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom))' : 4,
              position: 'relative',
            }}
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>

        {isMobile && <BottomNav />}
        <StreakDialog open={isStreakOpen} onClose={() => setIsStreakOpen(false)} />
      </Box>
    </AppCallbacksContext.Provider>
  );
}
