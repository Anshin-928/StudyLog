// src/App.jsx

import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import studyLogLogo from './assets/studyLogLogo.svg';
import { Box, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'; // メニュー

import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Record from './components/Record';
import Report from './components/Report';
import Materials from './components/Materials';
import Settings from './components/Settings';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  }

  return (
    <BrowserRouter>
        <Box sx={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#F0F4F9'
      }}>
        {/* AppBar */}
        <AppBar
          position='fixed'
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

              {/* ロゴ・アプリ名 */}
              <Box sx={{ display: 'flex', alignItems: 'center', width: '230px' }}>
                <img src={studyLogLogo} alt="StudyLog" style={{ height: '32px', marginRight: '12px' }} />
                <Typography variant="h6" sx={{ fontWeight: '900', fontSize: '24px', letterSpacing: '-0.5px' }}>
                  StudyLog
                </Typography>
              </Box>
            </Box>

            {/* 右側の空きスペース（将来検索窓やプロフィールアイコンを置く） */}
            <Box>
              {/* 今は空っぽにしておく */}
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
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            p: 4,
            display: 'flex',
            flexDirection: 'column'
          }}>

            {/* コンテンツ */}
            <Routes>
              {/* ログイン前の最初の画面（仮) */}
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

            </Routes>
            
          </Box>
        </Box>
      </Box>
    </BrowserRouter>
  )
}

export default App