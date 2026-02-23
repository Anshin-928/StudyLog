// src/components/Settings.jsx

import { Box, Typography, Grid } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

export default function Settings() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
          <SettingsOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          設定
        </Typography>
      </Box>

    </Box>
  );
}