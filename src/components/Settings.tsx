// src/components/Settings.tsx

import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SettingsContent from './SettingsContent';

export default function Settings() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* ページヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
          <SettingsOutlinedIcon />
        </Box>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>
          設定
        </Typography>
      </Box>

      {/* 設定セクション */}
      <Box sx={{ pb: 2 }}>
        <SettingsContent />
      </Box>

    </Box>
  );
}