// src/App.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import studyLogLogo from './assets/studyLogLogo.svg';
import { Box, AppBar, Toolbar, Typography, IconButton, CircularProgress } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';

import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import AuthPage from './components/AuthPage';
import Home from './components/Home';
import Record from './components/Record';
import Report from './components/Report';
import Materials from './components/Materials';
import Settings from './components/Settings';
import AddMaterial from './components/AddMaterial';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  // undefined = 確認中, null = 未ログイン, object = ログイン済み
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // セッション確認中
  if (session === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F0F4F9' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 未ログイン
  if (session === null) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // ログイン済み
  return (
    <BrowserRouter>
      <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#F0F4F9' }}>

        {/* AppBar */}
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: '#F0F4F9',
            color: '#333',
            boxShadow: 'none',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', pl: '16px' }}>
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
            <Box />
          </Toolbar>
        </AppBar>

        {/* サイドバー */}
        <Sidebar isSidebarOpen={isSidebarOpen} />

        {/* メイン */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            pb: 2,
            pr: 2,
            transition: 'margin-left 0.2s',
          }}
        >
          <Toolbar />
          <Box sx={{
            backgroundColor: '#FFFFFF',
            flexGrow: 1,
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/login" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/record" element={<Record />} />
              <Route path="/report" element={<Report />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/materials/add-new-material" element={<AddMaterial />} />
            </Routes>
          </Box>
        </Box>

      </Box>
    </BrowserRouter>
  );
}

export default App;