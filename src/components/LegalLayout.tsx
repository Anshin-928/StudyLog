// src/components/LegalLayout.tsx

import { Box, Typography, Divider, Button, useTheme, useMediaQuery } from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { useNavigate } from 'react-router-dom';
import studyLogLogo from '../assets/studyLogLogo.svg';
import studyLogLogoDark from '../assets/studyLogLogo_dark.svg';

interface Section {
  title: string;
  body: string;
}

interface LegalLayoutProps {
  pageTitle: string;
  lastUpdated: string;
  lead: string;
  sections: Section[];
}

export default function LegalLayout({ pageTitle, lastUpdated, lead, sections }: LegalLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.paper' }}>
      {/* ヘッダー */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        px: { xs: 2, sm: 4 }, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Button
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={handleBack}
          size="small"
          sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { backgroundColor: 'transparent', color: 'primary.main' } }}
        >
          戻る
        </Button>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img src={isDark ? studyLogLogoDark : studyLogLogo} alt="StudyLog" style={{ height: '22px' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '14px', color: 'text.secondary' }}>
            {pageTitle}
          </Typography>
        </Box>
      </Box>

      {/* 本文 */}
      <Box sx={{ maxWidth: '760px', mx: 'auto', px: { xs: 2.5, sm: 5 }, py: { xs: 4, sm: 6 } }}>
        <Typography sx={{ fontWeight: 900, fontSize: { xs: '22px', sm: '28px' }, letterSpacing: '-0.5px', mb: 1 }}>
          {pageTitle}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 4 }}>
          最終更新日：{lastUpdated}
        </Typography>

        <Typography sx={{ fontSize: isMobile ? '14px' : '15px', color: 'text.secondary', lineHeight: 1.9, mb: 5 }}>
          {lead}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map((section) => (
            <Box key={section.title}>
              <Typography sx={{ fontWeight: 700, fontSize: isMobile ? '15px' : '16px', mb: 1.5, color: 'text.primary' }}>
                {section.title}
              </Typography>
              <Typography sx={{ fontSize: isMobile ? '13px' : '14px', color: 'text.secondary', lineHeight: 2, whiteSpace: 'pre-wrap' }}>
                {section.body}
              </Typography>
              <Divider sx={{ mt: 4 }} />
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: '13px', color: 'text.disabled', mt: 5, textAlign: 'center' }}>
          © 2026 StudyLog. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
