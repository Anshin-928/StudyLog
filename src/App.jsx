import { useState } from 'react';
import studyLogLogo from './assets/studyLogLogo.svg';

import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton, 
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Button, Divider
} from '@mui/material';

import MenuRoundedIcon from '@mui/icons-material/MenuRounded'; // メニュー
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'; // ホーム
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined'; // 記録する
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'; // レポート
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'; // 教材管理
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'; // 設定

const mainMenus = [
  { text: 'ホーム', icon: <HomeOutlinedIcon />},
  { text: '記録する', icon: <ModeEditOutlineOutlinedIcon /> },
  { text: 'レポート', icon: <BarChartOutlinedIcon /> },
  { text: '教材管理', icon: <MenuBookOutlinedIcon /> },
  { text: '設定', icon: <SettingsOutlinedIcon /> }
]

const closedDrawerWidth = 72;
const openDrawerWidth = 310;

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(mainMenus[0]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  }

  return (
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
      <Drawer
        variant="permanent"
        anchor="left"
        open={isSidebarOpen}
        sx={{
          width: isSidebarOpen ? openDrawerWidth : closedDrawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'width 0.2s',
          '& .MuiDrawer-paper': {
            width: isSidebarOpen ? openDrawerWidth : closedDrawerWidth,
            transition: 'width 0.2s',
            overflowX: 'hidden',
            backgroundColor: '#F0F4F9',
            borderRight: 'none',
            color: '#333',
          },
        }}
      >
        <Toolbar /> 

        <List sx={{ px: 0 }}> 
          {mainMenus.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0 }}>
              <ListItemButton
                onClick={() => setActiveMenu(item)}
                selected={activeMenu.text === item.text}
                sx={{
                  minHeight: 48,
                  justifyContent: 'flex-start', 
                  ml: isSidebarOpen ? 0 : 1,
                  mr: isSidebarOpen ? 2 : 1,
                  px: 0, 
                  borderRadius: isSidebarOpen ? '0 24px 24px 0' : '24px',
                  '&.Mui-selected': {
                    backgroundColor: '#D3E3FD', 
                    '&:hover': { backgroundColor: activeMenu.text === item.text ? '#D3E3FD' : '#E3E3E3' },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    // ml: '16px',
                    ml: isSidebarOpen ? '24px' : '16px',
                    mr: '16px', 
                    justifyContent: 'center',
                    color: activeMenu.text === item.text ? '#1A73E8' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                
                {isSidebarOpen && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: activeMenu.text === item.text ? 'bold' : 'medium',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

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
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          p: 4
        }}>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 4,
            color: '#333'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 1.5,
              '& svg': { fontSize: '32px' }
            }}>
              {activeMenu.icon}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {activeMenu.text}
            </Typography>
          </Box>

          {/* 実際のコンテンツ */}
          <Typography sx={{ color: 'text.secondary', m: '0' }}>
            ここに各画面のメインコンテンツ（グラフやカレンダーなど）が入ります。
          </Typography>

        </Box>
      </Box>
    </Box>
  )
}

export default App