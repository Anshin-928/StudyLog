// src/App.jsx

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import studyLogLogo from './assets/studyLogLogo.svg';
import {
  Box, AppBar, Toolbar, Typography, IconButton, CircularProgress, Chip, Avatar,
  BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';

import { supabase } from './lib/supabase';
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

// ==========================================
// ストリーク計算
// ==========================================
function calcStreakFromDates(isoDates) {
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
// Context
// ==========================================
export const AppCallbacksContext = createContext({
  onRecordSaved: () => {},
  onProfileSaved: () => {},
});

function RecordPage() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <Record onRecordSaved={onRecordSaved} />;
}

function ProfilePage() {
  const { onProfileSaved } = useContext(AppCallbacksContext);
  return <Profile onProfileSaved={onProfileSaved} />;
}

// ==========================================
// ボトムナビゲーション（スマホ専用）
// ==========================================
const bottomNavItems = [
  { label: 'ホーム',   path: '/home',      icon: <HomeOutlinedIcon /> },
  { label: '記録する', path: '/record',    icon: <ModeEditOutlineOutlinedIcon /> },
  { label: 'レポート', path: '/report',    icon: <BarChartOutlinedIcon /> },
  { label: '教材',     path: '/materials', icon: <MenuBookOutlinedIcon /> },
  { label: 'プロフィール', path: '/profile', icon: <AccountCircleOutlinedIcon /> },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentIndex = bottomNavItems.findIndex(item => location.pathname.startsWith(item.path));

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        borderTop: '1px solid #e8e8e8',
        backgroundColor: '#fff',
        // iOS SafeArea 対応
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={currentIndex === -1 ? false : currentIndex}
        onChange={(_, newIndex) => navigate(bottomNavItems[newIndex].path)}
        sx={{ backgroundColor: 'transparent', height: 56 }}
      >
        {bottomNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            showLabel
            sx={{
              minWidth: 0,
              fontSize: '10px',
              color: '#aaa',
              '&.Mui-selected': { color: '#1A73E8' },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '10px',
                '&.Mui-selected': { fontSize: '10px' },
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

// ==========================================
// AppShell
// ==========================================
function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState(undefined);
  const [streak, setStreak] = useState(0);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [profileData, setProfileData] = useState({ display_name: '', avatar_url: null });

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
    const { data } = await supabase
      .from('study_logs').select('study_datetime').eq('user_id', user.id);
    if (data) setStreak(calcStreakFromDates(data.map(d => d.study_datetime)));
  }, []);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles').select('display_name, avatar_url').eq('id', user.id).single();
    if (data) setProfileData({ display_name: data.display_name || '', avatar_url: data.avatar_url || null });
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchStreak();
    fetchProfile();
  }, [session, fetchStreak, fetchProfile]);

  const callbacks = useMemo(() => ({
    onRecordSaved: fetchStreak,
    onProfileSaved: fetchProfile,
  }), [fetchStreak, fetchProfile]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const avatarLetter = (profileData.display_name || session?.user?.email || '?')[0]?.toUpperCase();

  if (session === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', backgroundColor: '#F0F4F9' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (session === null) return <Navigate to="/login" replace />;

  return (
    <AppCallbacksContext.Provider value={callbacks}>
      <Box sx={{ display: 'flex', height: '100dvh', backgroundColor: isMobile ? '#fff' : '#F0F4F9' }}>

        {/* AppBar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            backgroundColor: isMobile ? '#fff' : '#F0F4F9',
            color: '#333',
            boxShadow: isMobile ? '0 1px 0 #e8e8e8' : 'none',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', px: isMobile ? '12px' : '16px', minHeight: isMobile ? '52px !important' : '64px !important' }}>

            {/* ロゴ＋タイトル */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: isMobile ? 1 : 0 }}>
              {!isMobile && (
                <IconButton onClick={toggleSidebar} edge="start" sx={{ ml: 0, mr: 2 }}>
                  <MenuRoundedIcon />
                </IconButton>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', width: isMobile ? 'auto' : '230px' }}>
                <img src={studyLogLogo} alt="StudyLog" style={{ height: isMobile ? '24px' : '32px', marginRight: '8px' }} />
                <Typography variant="h6" sx={{ fontWeight: '900', fontSize: isMobile ? '18px' : '24px', letterSpacing: '-0.5px' }}>
                  StudyLog
                </Typography>
              </Box>
            </Box>

            {!isMobile && <Box sx={{ flexGrow: 1 }} />}

            {/* ストリーク */}
            <Chip
              icon={<LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 ? '#FF6B00' : '#bbb' }} />}
              label={`${streak}`}
              onClick={() => setIsStreakOpen(true)}
              sx={{
                fontWeight: 'bold',
                fontSize: isMobile ? '13px' : '16px',
                px: 0.5, py: isMobile ? 1.5 : 2,
                backgroundColor: streak > 0 ? '#FFF4EC' : '#f5f5f5',
                color: streak > 0 ? '#FF6B00' : '#999',
                border: streak > 0 ? '1px solid #FFE0C2' : '1px solid #e0e0e0',
                cursor: 'pointer', transition: '0.2s',
                '&:hover': { backgroundColor: streak > 0 ? '#FFE0C2' : '#e0e0e0' },
                '& .MuiChip-icon': { color: streak > 0 ? '#FF6B00' : '#bbb' },
                mr: 1,
              }}
            />

            {/* アバター（PCのみ） */}
            {!isMobile && (
              <IconButton component={Link} to="/profile" sx={{ p: 0.5 }}>
                <Avatar
                  src={profileData.avatar_url || undefined}
                  sx={{
                    width: 36, height: 36, fontSize: '15px', fontWeight: 'bold',
                    backgroundColor: '#1A73E8', border: '2px solid #D3E3FD',
                    transition: 'border-color 0.2s', '&:hover': { borderColor: '#1A73E8' },
                  }}
                >
                  {!profileData.avatar_url && avatarLetter}
                </Avatar>
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        {/* サイドバー（PC のみ描画・Sidebar 内部でも isMobile チェックあり） */}
        {!isMobile && <Sidebar isSidebarOpen={isSidebarOpen} />}

        {/* メインコンテンツ */}
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
          {/* AppBar の高さ分のスペーサー */}
          <Toolbar sx={{ minHeight: isMobile ? '52px !important' : '64px !important' }} />

          <Box sx={{
            backgroundColor: '#FFFFFF',
            flexGrow: 1,
            borderRadius: isMobile ? 0 : '24px',
            boxShadow: isMobile ? 'none' : '0 4px 12px rgba(0,0,0,0.05)',
            overflowX: 'hidden',
            overflowY: 'auto',
            p: isMobile ? 2 : 4,
            display: 'flex',
            flexDirection: 'column',
            pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 4,
            position: 'relative'
          }}>
            <Outlet />
          </Box>
        </Box>

        {/* ボトムナビ（スマホのみ） */}
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
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'login', element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'record', element: <RecordPage /> },
      { path: 'report', element: <Report /> },
      { path: 'materials', element: <Materials /> },
      { path: 'settings', element: <Settings /> },
      { path: 'materials/add-new-material', element: <AddMaterial /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}