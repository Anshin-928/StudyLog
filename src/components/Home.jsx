// src/components/Home.jsx

import { Box, Typography, Grid } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, '& svg': { fontSize: '32px' } }}>
          <HomeOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          ホーム
        </Typography>
      </Box>

      {/* <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ backgroundColor: '#F8FAFD', borderRadius: '16px', p: 3, height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>学習時間の推移</Typography>
            <Box sx={{ flexGrow: 1, border: '2px dashed #D3E3FD', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 'bold' }}>ここにRechartsなどの棒グラフが入ります 📊</Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            <Box sx={{ backgroundColor: '#F8FAFD', borderRadius: '16px', p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 0.5 }}>🎯 次の目標まで</Typography>
              <Typography variant="h6" sx={{ fontWeight: '900', color: '#333', lineHeight: 1.2 }}>TOEIC 800点突破</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 1.5 }}>
                <Typography variant="h2" sx={{ fontWeight: '900', color: '#1A73E8', letterSpacing: '-2px' }}>20</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666', ml: 0.5 }}>日</Typography>
              </Box>
            </Box>

            <Box sx={{ backgroundColor: '#F8FAFD', borderRadius: '16px', p: 3 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 0.5 }}>🌸 春期試験まで</Typography>
              <Typography variant="h6" sx={{ fontWeight: '900', color: '#333', lineHeight: 1.2 }}>応用情報技術者試験</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 1.5 }}>
                <Typography variant="h2" sx={{ fontWeight: '900', color: '#1A73E8', letterSpacing: '-2px' }}>55</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666', ml: 0.5 }}>日</Typography>
              </Box>
            </Box>

          </Box>
        </Grid>

      </Grid> */}
    </Box>
  );
}