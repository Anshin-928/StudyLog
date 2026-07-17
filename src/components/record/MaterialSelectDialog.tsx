// src/components/record/MaterialSelectDialog.tsx
// 教材選択ダイアログ（Record / EditRecordDialog 共通）

import {
  Box, Typography, CircularProgress, Divider, IconButton,
  Card, CardMedia, CardContent,
  Dialog, DialogTitle, DialogContent,
  useMediaQuery, useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import type { Material } from '../../types/record';

function SelectableMaterialCard({
  material, isSelected, onSelect,
}: {
  material: Material;
  isSelected: boolean;
  onSelect: (m: Material) => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card
      onClick={() => onSelect(material)}
      sx={{
        height: { xs: '165px', sm: '200px' },
        width: '100%',
        display: 'flex', flexDirection: 'column',
        borderRadius: '12px', cursor: 'pointer',
        transition: 'all 0.18s', position: 'relative',
        border: isSelected ? '2.5px solid' : '0.5px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        boxShadow: isSelected ? theme.customShadows.sm : 'none',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.customShadows.md },
        backgroundColor: 'background.paper',
      }}
    >
      {isSelected && (
        <CheckCircleIcon sx={{
          position: 'absolute', top: 6, right: 6,
          color: 'primary.main', fontSize: isMobile ? '16px' : '20px',
          backgroundColor: 'background.paper', borderRadius: '50%', zIndex: 1,
        }} />
      )}
      <Box sx={{ height: { xs: '100px', sm: '130px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: isMobile ? 1 : 1.5 }}>
        <CardMedia
          component="img"
          sx={{ height: '100%', maxHeight: { xs: '80px', sm: '110px' }, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          image={material.image} alt={material.name}
        />
      </Box>
      <CardContent sx={{
        p: isMobile ? '4px 6px !important' : 1.5, flexGrow: 1,
        backgroundColor: isSelected ? 'primary.lighter' : 'background.paper',
        borderRadius: '0 0 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      }}>
        <Typography variant="caption" sx={{
          fontWeight: 'bold', fontSize: { xs: '10px', sm: '11px' }, lineHeight: 1.2,
          display: '-webkit-box', overflow: 'hidden',
          WebkitBoxOrient: 'vertical', WebkitLineClamp: 3,
          color: isSelected ? 'primary.main' : 'text.primary',
        }}>
          {material.name}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function MaterialSelectDialog({
  open, onClose, materials, isLoading = false, currentMaterial, onSelect,
}: {
  open: boolean; onClose: () => void; materials: Material[];
  isLoading?: boolean; currentMaterial: Material | null | 'none';
  onSelect: (m: Material | 'none') => void;
}) {
  const theme = useTheme();
  const groupedMaterials = materials.reduce((acc: Record<string, Material[]>, m) => {
    if (!acc[m.categoryName]) acc[m.categoryName] = [];
    acc[m.categoryName].push(m);
    return acc;
  }, {});
  const sortedCategoryEntries = Object.entries(groupedMaterials).sort((a, b) =>
    (a[1][0]?.sortOrder || 0) - (b[1][0]?.sortOrder || 0),
  );
  const isNoneSelected = currentMaterial === 'none';

  return (
    <Dialog open={open} onClose={onClose} fullWidth
      PaperProps={{ sx: { borderRadius: '20px', height: '80vh', display: 'flex', flexDirection: 'column', m: { xs: 0.5, sm: 2 }, width: { xs: 'calc(100% - 32px)', sm: '100%' }, maxWidth: { xs: 'none', sm: 'md' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, fontWeight: 'bold', color: 'text.primary' }}>
        教材を選択
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ flexGrow: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, pt: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box onClick={() => { onSelect('none'); onClose(); }} sx={{
              mb: 3, p: 2, border: isNoneSelected ? '2px solid' : '1.5px dashed',
              borderColor: isNoneSelected ? 'primary.main' : 'divider',
              borderRadius: '12px', cursor: 'pointer',
              backgroundColor: isNoneSelected ? 'primary.lighter' : 'background.subtle',
              display: 'flex', alignItems: 'center', gap: 1.5, transition: '0.15s',
              '&:hover': { borderColor: 'primary.main', backgroundColor: 'primary.lighter' },
            }}>
              {isNoneSelected && <CheckCircleIcon sx={{ color: 'primary.main', fontSize: '20px' }} />}
              <Box>
                <Typography sx={{ fontWeight: 'bold', color: isNoneSelected ? 'primary.main' : 'text.secondary', fontSize: '14px' }}>
                  教材を選択しない
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>「教材なし」として記録します</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {sortedCategoryEntries.map(([categoryName, items]) => (
              <Box key={categoryName} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 'bold', color: 'text.primary', mb: 1.5, pl: 1,
                  borderLeft: `4px solid ${items[0]?.colorCode || theme.palette.primary.main}`,
                }}>
                  {categoryName}
                </Typography>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(auto-fill, minmax(140px, 1fr))' },
                  gap: { xs: 1, sm: 2 }
                }}>
                  {items.map((item) => (
                    <SelectableMaterialCard
                      key={item.id} material={item}
                      isSelected={currentMaterial !== 'none' && (currentMaterial as Material)?.id === item.id}
                      onSelect={(m) => { onSelect(m); onClose(); }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
