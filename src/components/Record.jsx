// src/components/Record.jsx

import { Box, Typography, Grid } from '@mui/material';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';

export default function Record() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
          <ModeEditOutlineOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          記録する
        </Typography>
      </Box>

    </Box>
  );
}