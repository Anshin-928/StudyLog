// src/components/Report.jsx

import { Box, Typography, Grid } from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';

export default function Report() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
          <BarChartOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          レポート
        </Typography>
      </Box>

    </Box>
  );
}