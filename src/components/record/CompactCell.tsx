// src/components/record/CompactCell.tsx
// 記録入力フォームの1行セル（Record / EditRecordDialog 共通）

import React from 'react';
import { Box, Typography } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

export default function CompactCell({
  icon, value, placeholder, onClick, highlight = false, rightSlot,
}: {
  icon: React.ReactNode;
  value?: string;
  placeholder: string;
  onClick: () => void;
  highlight?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const hasValue = !!value;
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center',
        borderRadius: '12px',
        border: highlight ? '2px solid' : '1px solid',
        borderColor: highlight ? 'primary.main' : 'divider',
        backgroundColor: highlight ? 'primary.lighter' : 'background.subtle',
        mb: 1.5, px: 2,
        height: '48px',
        transition: '0.15s', cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover', borderColor: 'primary.main' },
      }}
      onClick={onClick}
    >
      <Box sx={{ color: highlight ? 'primary.main' : 'text.disabled', display: 'flex', mr: 1.5, flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography sx={{
        flexGrow: 1, fontWeight: 'bold', fontSize: '14px',
        color: hasValue ? (highlight ? 'primary.main' : 'text.primary') : 'text.disabled',
      }}>
        {value || placeholder}
      </Typography>
      {rightSlot ?? <KeyboardArrowRightIcon sx={{ color: highlight ? 'primary.main' : 'text.disabled', fontSize: '20px', flexShrink: 0 }} />}
    </Box>
  );
}
