// src/components/UnitSelector.tsx

import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material'; // 🌟 useTheme, alpha を追加
import { MATERIAL_UNITS, MaterialUnit } from '../constants/materialUnits';

interface UnitSelectorProps {
  value: MaterialUnit;
  onChange: (unit: MaterialUnit) => void;
  disabled?: boolean;
}

export default function UnitSelector({ value, onChange, disabled = false }: UnitSelectorProps) {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
        学習量の単位
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {MATERIAL_UNITS.map((unit) => {
          const selected = value === unit;
          return (
            <Box
              key={unit}
              onClick={() => !disabled && onChange(unit)}
              sx={{
                px: 2, py: 0.75,
                borderRadius: '20px',
                border: selected ? '2px solid' : '1.5px solid',
                borderColor: selected ? 'primary.main' : 'divider',
                backgroundColor: selected ? alpha(theme.palette.primary.main, 0.1) : 'background.default',
                color: selected ? 'primary.main' : 'text.primary',
                fontWeight: selected ? 'bold' : 'normal',
                fontSize: '14px',
                cursor: disabled ? 'default' : 'pointer',
                userSelect: 'none',
                transition: '0.15s',
                '&:hover': !disabled ? {
                  borderColor: 'primary.main',
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                } : {},
              }}
            >
              {unit}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}