// src/App.jsx

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import studyLogLogo from './assets/studyLogLogo.svg';
import { Box, AppBar, Toolbar, Typography, IconButton, Chip } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';

import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Record from './components/Record';
import Report from './components/Report';
import Materials from './components/Materials';
import Settings from './components/Settings';
import AddMaterial from './components/AddMaterial';
import StreakDialog from './components/StreakDialog';
import { supabase } from './lib/supabase';

// ==========================================
// ストリーク計算（App レベルで軽量に実行）
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
    const co = cursor.getTimezoneOffset();
    const key = new Date(cursor.getTime() - co * 60000).toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isStreakOpen, setIsStreakOpen] = useState(false);
  const [streakCount, setStreakCount] = useState(null); // null = 未ロード

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // ヘッダー用にストリーク数を軽量フェッチ
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const { data } = await supabase
          .from('study_logs')
          .select('study_datetime');
        if (data) {
          setStreakCount(calcStreakFromDates(data.map(r => r.study_datetime)));
        }
      } catch (e) {
        console.error('streak fetch error:', e);
      }
    };
    fetchStreak();
  }, []);

  // StreakDialog が閉じたあとに再計算（記録直後など）
  const handleStreakClose = async () => {
    setIsStreakOpen(false);
    try {
      const { data } = await supabase.from('study_logs').select('study_datetime');
      if (data) setStreakCount(calcStreakFromDates(data.map(r => r.study_datetime)));
    } catch (_) {}
  };

  // 炎アイコンの色（ストリーク長さに応じて変化）
  const fireColor =
    streakCount === null ? '#ccc'
    : streakCount >= 30 ? '#ff0000'
    : streakCount >= 7  ? '#ff4400'
    : streakCount > 0   ? '#ff6600'
    : '#ccc';

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
          <Toolbar disableGutters sx={{ display: 'flex', alignItems: 'center', pl: '16px', pr: '16px' }}>

            {/* 左側：ハンバーガー + ロゴ */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
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

            {/* 右側：ストリークボタン */}
            <Box
              onClick={() => setIsStreakOpen(true)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                cursor: 'pointer',
                backgroundColor: streakCount > 0 ? `${fireColor}18` : '#f5f5f5',
                border: `1.5px solid ${streakCount > 0 ? `${fireColor}40` : '#e0e0e0'}`,
                borderRadius: '20px',
                px: 1.5, py: 0.75,
                transition: '0.15s',
                '&:hover': {
                  backgroundColor: streakCount > 0 ? `${fireColor}28` : '#eee',
                  transform: 'scale(1.03)',
                },
              }}
            >
              <LocalFireDepartmentRoundedIcon sx={{ fontSize: '20px', color: fireColor }} />
              <Typography sx={{
                fontWeight: '900', fontSize: '16px',
                color: streakCount > 0 ? fireColor : '#bbb',
                minWidth: '16px', textAlign: 'center',
                lineHeight: 1,
              }}>
                {streakCount === null ? '–' : streakCount}
              </Typography>
            </Box>

          </Toolbar>
        </AppBar>

        {/* サイドバー */}
        <Sidebar isSidebarOpen={isSidebarOpen} />

        {/* メイン画面 */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            pb: 2, pr: 2,
            transition: 'margin-left 0.2s',
          }}
        >
          <Toolbar />

          <Box sx={{
            backgroundColor: '#FFFFFF',
            flexGrow: 1,
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Routes>
              <Route path="/" element={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                  <Typography variant="h4" sx={{ fontWeight: '900', color: '#1A73E8', mb: 2 }}>StudyLogへようこそ！</Typography>
                  <Typography sx={{ color: 'text.secondary', fontWeight: 'bold' }}>※ここにログイン画面やLPを作ります</Typography>
                </Box>
              } />
              <Route path="/home" element={<Home />} />
              <Route path="/record" element={<Record />} />
              <Route path="/report" element={<Report />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/materials/add-new-material" element={<AddMaterial />} />
            </Routes>
          </Box>
        </Box>

        {/* ストリークダイアログ */}
        <StreakDialog open={isStreakOpen} onClose={handleStreakClose} />

      </Box>
    </BrowserRouter>
  );
}

export default App;