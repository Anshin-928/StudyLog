// src/components/UnitSelector.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';
import { MATERIAL_UNITS, MaterialUnit } from '../constants/materialUnits';

interface UnitSelectorProps {
  value: MaterialUnit;
  onChange: (unit: MaterialUnit) => void;
  disabled?: boolean;
}

export default function UnitSelector({ value, onChange, disabled = false }: UnitSelectorProps) {
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#666' }}>
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
                border: selected ? '2px solid #1A73E8' : '1.5px solid #e0e0e0',
                backgroundColor: selected ? '#e8f0fe' : '#fafafa',
                color: selected ? '#1A73E8' : '#555',
                fontWeight: selected ? 'bold' : 'normal',
                fontSize: '14px',
                cursor: disabled ? 'default' : 'pointer',
                userSelect: 'none',
                transition: '0.15s',
                '&:hover': !disabled ? {
                  borderColor: '#1A73E8',
                  backgroundColor: '#f0f4fd',
                  color: '#1A73E8',
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