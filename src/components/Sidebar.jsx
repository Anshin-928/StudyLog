// src/components/Sidebar.jsx

import {
  Drawer, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  useMediaQuery, useTheme, alpha,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';

export const mainMenus = [
  { text: 'ホーム',        path: '/home',      icon: <HomeOutlinedIcon /> },
  { text: '記録する',      path: '/record',    icon: <ModeEditOutlineOutlinedIcon /> },
  { text: 'レポート',      path: '/report',    icon: <BarChartOutlinedIcon /> },
  { text: '教材管理',      path: '/materials', icon: <MenuBookOutlinedIcon /> },
  { text: 'ユーザーを探す', path: '/users',     icon: <PeopleOutlinedIcon /> },
  { text: '設定',         path: '/settings',  icon: <SettingsOutlinedIcon /> },
];

export const closedDrawerWidth = 72;
export const openDrawerWidth = 250;

export default function Sidebar({ isSidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile) return null;

  // 選択中の背景色：ライトは #D3E3FD、ダークはプライマリの薄い透過
  const selectedBg = theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.main, 0.18)
    : '#D3E3FD';

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
          backgroundColor: theme.palette.background.default,
          borderRight: 'none',
          color: theme.palette.text.primary,
        },
      }}
    >
      <Toolbar />
      <List sx={{ px: 0 }}>
        {mainMenus.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={isSelected}
                sx={{
                  minHeight: 48,
                  justifyContent: 'flex-start',
                  ml: isSidebarOpen ? 0 : 1,
                  mr: isSidebarOpen ? 2 : 1,
                  px: 0,
                  borderRadius: isSidebarOpen ? '0 24px 24px 0' : '24px',
                  '&.Mui-selected': {
                    backgroundColor: selectedBg,
                    '&:hover': { backgroundColor: selectedBg },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    ml: isSidebarOpen ? '24px' : '16px',
                    mr: '16px',
                    justifyContent: 'center',
                    color: isSelected ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {isSidebarOpen && (
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: isSelected ? 'bold' : 'medium',
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}