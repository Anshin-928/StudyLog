// src/components/Sidebar.jsx

import {
  Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'; // ホーム
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined'; // 記録する
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'; // レポート
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'; // 教材管理
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'; // 設定

export const mainMenus = [
  { text: 'ホーム', path:'/home', icon: <HomeOutlinedIcon />},
  { text: '記録する', path:'/record', icon: <ModeEditOutlineOutlinedIcon /> },
  { text: 'レポート', path:'/report', icon: <BarChartOutlinedIcon /> },
  { text: '教材管理', path:'/materials', icon: <MenuBookOutlinedIcon /> },
  { text: '設定', path:'/settings', icon: <SettingsOutlinedIcon /> }
];

export const closedDrawerWidth = 72;
export const openDrawerWidth = 310;

export default function Sidebar({ isSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
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
                onClick={() => navigate(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: 'flex-start', 
                  ml: isSidebarOpen ? 0 : 1,
                  mr: isSidebarOpen ? 2 : 1,
                  px: 0, 
                  borderRadius: isSidebarOpen ? '0 24px 24px 0' : '24px',
                  '&.Mui-selected': {
                    backgroundColor: '#D3E3FD', 
                    '&:hover': { backgroundColor: location.pathname === item.path ? '#D3E3FD' : '#E3E3E3' },
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
                    color: location.pathname === item.path ? '#1A73E8' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                
                {isSidebarOpen && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: location.pathname === item.path ? 'bold' : 'medium',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
  )
}