// src/App.tsx

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import studyLogLogo from './assets/studyLogLogo.svg';
import studyLogLogoDark from './assets/studyLogLogo_dark.svg';
import {
  Box, AppBar, Toolbar, Typography, IconButton, CircularProgress, Chip, Avatar,
  BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme,
  createTheme, ThemeProvider, CssBaseline,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

import { supabase } from './lib/supabase';
import defaultAvatarPng from './assets/defaultAvatarPng.png';
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import Home from './components/Home';
import Record from './components/Record';
import Report from './components/Report';
import Materials from './components/Materials';
import Settings from './components/Settings';
import AddMaterial from './components/AddMaterial';
import StreakDialog from './components/StreakDialog';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import Users from './components/Users';
import ResetPasswordPage from './components/ResetPasswordPage';

// ==========================================
// MUI テーマ型拡張
// ==========================================
declare module '@mui/material/styles' {
  interface Theme {
    customShadows: { sm: string; md: string; lg: string };
  }
  interface ThemeOptions {
    customShadows?: { sm: string; md: string; lg: string };
  }
  interface Palette {
    streak: { main: string; lighter: string; border: string };
    chart: string[];
  }
  interface PaletteOptions {
    streak?: { main: string; lighter: string; border: string };
    chart?: string[];
  }
  interface PaletteColor {
    lighter?: string;
  }
  interface SimplePaletteColorOptions {
    lighter?: string;
  }
  interface TypeBackground {
    subtle: string;
    overlay: string;
  }
}

// ==========================================
// Context
// ==========================================
const THEME_KEY = 'studylog-theme-mode';

interface ColorModeContextType {
  mode: string;
  toggleColorMode: () => void;
}
export const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

interface AppCallbacksContextType {
  onRecordSaved: () => void;
  onProfileSaved: () => void;
}
export const AppCallbacksContext = createContext<AppCallbacksContextType>({
  onRecordSaved: () => {},
  onProfileSaved: () => {},
});

// ==========================================
// ストリーク計算
// ==========================================
function calcStreakFromDates(isoDates: string[]): number {
  const dates = new Set(
    isoDates.map(iso => {
      const d = new Date(iso);
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
    })
  );
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const today = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const off = cursor.getTimezoneOffset();
    const key = new Date(cursor.getTime() - off * 60000).toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ==========================================
// ページラッパー
// ==========================================
function RecordPage() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <Record onRecordSaved={onRecordSaved} />;
}

function HomePage() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <Home onRecordDeleted={onRecordSaved} />;
}

function EditProfilePage() {
  const { onProfileSaved } = useContext(AppCallbacksContext);
  return <EditProfile onProfileSaved={onProfileSaved} />;
}

// ==========================================
// ボトムナビゲーション（スマホ専用）
// ==========================================
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
}

const bottomNavItems: NavItem[] = [
  { label: 'ホーム',   path: '/home',      icon: <HomeOutlinedIcon /> },
  { label: '記録する', path: '/record',    icon: <ModeEditOutlineOutlinedIcon /> },
  { label: 'レポート', path: '/report',    icon: <BarChartOutlinedIcon /> },
  { label: '教材',     path: '/materials', icon: <MenuBookOutlinedIcon /> },
  { label: '設定',     path: '/settings',  icon: <SettingsOutlinedIcon /> },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const currentPath = bottomNavItems.find(item => location.pathname.startsWith(item.path))?.path || false;

  return (
    <Box
      sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
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
              m: '4px', p: '4px',
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

function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [isStudiedToday, setIsStudiedToday] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({ display_name: '', avatar_url: null });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchStreak = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('study_logs').select('study_datetime').eq('user_id', user.id);
    if (data) {
      const isoDates = data.map((d: { study_datetime: string }) => d.study_datetime);
      setStreak(calcStreakFromDates(isoDates));
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const today = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
      setIsStudiedToday(isoDates.some(iso => {
        const d = new Date(iso);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) === today;
      }));
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
    if (data) setProfileData({ display_name: data.display_name || '', avatar_url: data.avatar_url || null });
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchStreak();
    fetchProfile();
  }, [session, fetchStreak, fetchProfile]);

  const callbacks = useMemo<AppCallbacksContextType>(() => ({
    onRecordSaved: fetchStreak,
    onProfileSaved: fetchProfile,
  }), [fetchStreak, fetchProfile]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  if (session === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  if (session === null) return <Navigate to="/login" replace />;

  return (
    <AppCallbacksContext.Provider value={callbacks}>
      <Box sx={{ display: 'flex', height: '100dvh', backgroundColor: theme.palette.background.default }}>

        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: isMobile ? theme.palette.background.paper : theme.palette.background.default,
            color: theme.palette.text.primary,
            boxShadow: isMobile ? `0 1px 0 ${theme.palette.divider}` : 'none',
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', px: isMobile ? '12px' : '16px', minHeight: isMobile ? '52px !important' : '64px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: isMobile ? 1 : 0 }}>
              {!isMobile && (
                <IconButton onClick={toggleSidebar} edge="start" sx={{ ml: 0, mr: 2, color: theme.palette.text.primary }}>
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', width: isMobile ? 'auto' : '230px' }}>
                <img
                  src={theme.palette.mode === 'dark' ? studyLogLogoDark : studyLogLogo}
                  alt="StudyLog"
                  style={{ height: isMobile ? '30px' : '32px', marginRight: '8px' }}
                />
                <Typography variant="h6" sx={{ fontWeight: '900', fontSize: isMobile ? '20px' : '24px', letterSpacing: '-0.5px' }}>
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
                px: 0.5, py: isMobile ? 1.5 : 2,
                backgroundColor: streak > 0 && isStudiedToday ? theme.palette.streak.lighter : theme.palette.action.hover,
                color: streak > 0 && isStudiedToday ? theme.palette.streak.main : theme.palette.text.disabled,
                border: streak > 0 && isStudiedToday ? `1px solid ${theme.palette.streak.border}` : `1px solid ${theme.palette.divider}`,
                cursor: 'pointer', transition: '0.2s',
                '&:hover': {
                  backgroundColor: streak > 0 && isStudiedToday ? theme.palette.streak.lighter : theme.palette.action.selected,
                  opacity: 0.8,
                },
                '& .MuiChip-icon': {
                  color: streak > 0 && isStudiedToday ? `${theme.palette.streak.main} !important` : theme.palette.text.disabled,
                },
                mr: 1,
              }}
            />

            <IconButton component={Link} to="/profile" sx={{ p: 0.5 }}>
              <Avatar
                src={profileData.avatar_url || defaultAvatarPng}
                sx={{
                  width: 36, height: 36, fontSize: '15px', fontWeight: 'bold',
                  backgroundColor: theme.palette.primary.main,
                  border: `2px solid ${theme.palette.primary.lighter}`,
                  transition: 'border-color 0.2s', '&:hover': { borderColor: theme.palette.primary.main },
                }}
              />
            </IconButton>
          </Toolbar>
        </AppBar>

        {!isMobile && <Sidebar isSidebarOpen={isSidebarOpen} />}

        <Box
          component="main"
          sx={{
            flexGrow: 1, display: 'flex', flexDirection: 'column',
            pb: isMobile ? 0 : 2, pr: isMobile ? 0 : 2,
            transition: 'margin-left 0.2s',
            minWidth: 0, minHeight: 0, overflow: 'hidden',
          }}
        >
          <Toolbar sx={{ minHeight: isMobile ? '52px !important' : '64px !important' }} />
          <Box sx={{
            backgroundColor: theme.palette.background.paper,
            flexGrow: 1,
            borderRadius: isMobile ? 0 : '24px',
            boxShadow: isMobile ? 'none' : (theme.palette.mode === 'dark' ? 'none' : theme.customShadows.sm),
            overflowX: 'hidden', overflowY: 'auto',
            p: isMobile ? 2 : 4,
            display: 'flex', flexDirection: 'column',
            pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom))' : 4,
            position: 'relative',
          }}>
            <Outlet />
          </Box>
        </Box>

        {isMobile && <BottomNav />}
        <StreakDialog open={isStreakOpen} onClose={() => setIsStreakOpen(false)} />
      </Box>
    </AppCallbacksContext.Provider>
  );
}

// ==========================================
// ルーター定義
// ==========================================
const router = createBrowserRouter([
  { path: '/login', element: <AuthPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'login', element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'record', element: <RecordPage /> },
      { path: 'report', element: <Report /> },
      { path: 'materials', element: <Materials /> },
      { path: 'settings', element: <Settings /> },
      { path: 'materials/add-new-material', element: <AddMaterial /> },
      { path: 'profile', element: <Profile /> },
      { path: 'profile/edit', element: <EditProfilePage /> },
      { path: 'users', element: <Users /> },
      { path: 'users/:userId', element: <Profile /> },
    ],
  },
]);

// ==========================================
// App ルート（テーマ管理）
// ==========================================
export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
  });

  const colorMode = useMemo<ColorModeContextType>(() => ({
    mode,
    toggleColorMode: () => {
      setMode(prev => {
        const next = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, next);
        return next;
      });
    },
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#4285F4',
        lighter: mode === 'dark' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(66, 133, 244, 0.08)',
      },
      chart: [
        '#1A73E8', '#34A853', '#EA4335', '#FBBC05', '#8E24AA',
        '#00ACC1', '#FF6D00', '#546E7A', '#D81B60', '#00897B',
      ],
      error: {
        main: mode === 'dark' ? '#ff5252' : '#d32f2f',
        dark: mode === 'dark' ? '#ff867f' : '#b71c1c',
        lighter: mode === 'dark' ? 'rgba(255, 82, 82, 0.15)' : 'rgba(211, 47, 47, 0.05)',
        contrastText: '#FFFFFF',
      },
      success: {
        main: mode === 'dark' ? '#81c995' : '#34A853',
        lighter: mode === 'dark' ? 'rgba(129, 201, 149, 0.15)' : 'rgba(52, 168, 83, 0.1)',
      },
      warning: {
        main: mode === 'dark' ? '#fdd663' : '#FBBC04',
        lighter: mode === 'dark' ? 'rgba(253, 214, 99, 0.15)' : 'rgba(251, 188, 4, 0.1)',
      },
      streak: {
        main: '#FF6B00',
        lighter: mode === 'dark' ? 'rgba(255, 107, 0, 0.15)' : '#FFF4EC',
        border: mode === 'dark' ? 'rgba(255, 107, 0, 0.3)' : '#FFE0C2',
      },
      background: {
        default: mode === 'dark' ? '#202124' : '#F0F4F9',
        paper: mode === 'dark' ? '#303134' : '#FFFFFF',
        subtle: mode === 'dark' ? '#3c4043' : '#f9f9f9',
        overlay: mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
      },
      text: {
        primary: mode === 'dark' ? '#e8eaed' : '#333333',
        secondary: mode === 'dark' ? '#9aa0a6' : '#666666',
        disabled: mode === 'dark' ? '#5f6368' : '#aaaaaa',
      },
      divider: mode === 'dark' ? '#3c4043' : '#E8E8E8',
    },
    customShadows: {
      sm: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.5)'  : '0 2px 4px rgba(0,0,0,0.1)',
      md: mode === 'dark' ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
      lg: mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.2)',
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
