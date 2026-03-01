// src/App.jsx

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, Link } from 'react-router-dom';
import studyLogLogo from './assets/studyLogLogo.svg';
import { Box, AppBar, Toolbar, Typography, IconButton, CircularProgress, Chip, Avatar } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';

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
// Context：ページへコールバックを渡す
// ==========================================
export const AppCallbacksContext = createContext({
  onRecordSaved: () => {},
  onProfileSaved: () => {},
});

// ==========================================
// ルートラッパー（Context から props を注入）
// ==========================================
function RecordPage() {
  const { onRecordSaved } = useContext(AppCallbacksContext);
  return <Record onRecordSaved={onRecordSaved} />;
}

function ProfilePage() {
  const { onProfileSaved } = useContext(AppCallbacksContext);
  return <Profile onProfileSaved={onProfileSaved} />;
}

// ==========================================
// AppShell：レイアウト + セッション/ストリーク/プロフィール管理
// ==========================================
function AppShell() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState(undefined);
  const [streak, setStreak] = useState(0);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [profileData, setProfileData] = useState({ display_name: '', avatar_url: null });

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F0F4F9' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppCallbacksContext.Provider value={callbacks}>
      <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#F0F4F9' }}>

        {/* AppBar */}
        <AppBar position="fixed" sx={{ backgroundColor: '#F0F4F9', color: '#333', boxShadow: 'none', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', px: '16px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={toggleSidebar} edge="start" sx={{ ml: 0, mr: 2 }}>
                <MenuRoundedIcon />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '230px' }}>
                <img src={studyLogLogo} alt="StudyLog" style={{ height: '32px', marginRight: '12px' }} />
                <Typography variant="h6" sx={{ fontWeight: '900', fontSize: '24px', letterSpacing: '-0.5px' }}>
                  StudyLog
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* ストリーク */}
            <Chip
              icon={<LocalFireDepartmentRoundedIcon sx={{ color: streak > 0 ? '#FF6B00' : '#bbb' }} />}
              label={`${streak}`}
              onClick={() => setIsStreakOpen(true)}
              sx={{
                fontWeight: 'bold', fontSize: '16px', px: 0.5, py: 2,
                backgroundColor: streak > 0 ? '#FFF4EC' : '#f5f5f5',
                color: streak > 0 ? '#FF6B00' : '#999',
                border: streak > 0 ? '1px solid #FFE0C2' : '1px solid #e0e0e0',
                cursor: 'pointer', transition: '0.2s',
                '&:hover': { backgroundColor: streak > 0 ? '#FFE0C2' : '#e0e0e0' },
                '& .MuiChip-icon': { color: streak > 0 ? '#FF6B00' : '#bbb' },
                mr: 1,
              }}
            />

            {/* プロフィールアバター */}
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
          </Toolbar>
        </AppBar>

        {/* サイドバー */}
        <Sidebar isSidebarOpen={isSidebarOpen} />

        {/* メイン */}
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pb: 2, pr: 2, transition: 'margin-left 0.2s' }}>
          <Toolbar />
          <Box sx={{
            backgroundColor: '#FFFFFF', flexGrow: 1, borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden',
            p: 4, display: 'flex', flexDirection: 'column',
          }}>
            <Outlet />
          </Box>
        </Box>

        <StreakDialog open={isStreakOpen} onClose={() => setIsStreakOpen(false)} />
      </Box>
    </AppCallbacksContext.Provider>
  );
}

// ==========================================
// ルーター定義（createBrowserRouter → useBlocker が使える）
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