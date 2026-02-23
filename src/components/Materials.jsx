// src/components/Materials.jsx

import { Box, Typography, Grid } from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

export default function Materials() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
          <MenuBookOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          教材管理
        </Typography>
      </Box>

    </Box>
  );
}