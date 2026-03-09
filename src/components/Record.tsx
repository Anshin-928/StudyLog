// src/components/Record.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, TextField, Button,
  Card, CardMedia, CardContent, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Divider, ListItemButton, ListItemText, ListItemIcon,
  Snackbar, Alert, Fade, useMediaQuery, useTheme
} from '@mui/material';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useBlocker, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NavigationBlockerDialog from './NavigationBlockerDialog';

interface Material {
  id: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
  sortOrder: number;
  unit: string;
}

// ==========================================
// ユーティリティ
// ==========================================
function formatDuration(mins: number): string {
  if (mins <= 0) return '---';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function formatDatetime(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '---';
  const yyyy = d.getFullYear();
  const mo = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}年${mo}月${dd}日 ${hh}:${mm}`;
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function extractDate(dt: string): string {
  return dt.slice(0, 10);
}

function extractTime(dt: string): string {
  return dt.slice(11, 16);
}

function combineDatetime(date: string, time: string): string {
  return `${date}T${time}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// ==========================================
// 教材選択モーダル内のカード
// ==========================================
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
      <Box sx={{ height: { xs: '100px', sm: '130px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', p: isMobile ? 1 : 1.5  }}>
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

// ==========================================
// 教材選択モーダル
// ==========================================
function MaterialSelectDialog({
  open, onClose, materials, isLoading, currentMaterial, onSelect,
}: {
  open: boolean; onClose: () => void; materials: Material[];
  isLoading: boolean; currentMaterial: Material | null | 'none';
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

// ==========================================
// 日付・時刻選択ダイアログ
// ==========================================
function DateDialog({
  open, onClose, value, onChange,
}: {
  open: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    if (open) {
      setLocalDate(extractDate(value));
      setLocalTime(extractTime(value));
    }
  }, [open, value]);

  const today = daysAgo(0);
  const yesterday = daysAgo(1);

  const quickDates = [
    { label: '今日', value: today },
    { label: '昨日', value: yesterday },
  ];

  const handleConfirm = () => {
    onChange(combineDatetime(localDate, localTime));
    onClose();
  };

  const handleNow = () => {
    const now = nowDatetimeLocal();
    setLocalDate(extractDate(now));
    setLocalTime(extractTime(now));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: {xs: 2, sm: 'auto'}, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>日付・時刻を選択</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, mt: 1 }}>
          {quickDates.map((qd) => {
            const isActive = localDate === qd.value;
            return (
              <Button
                key={qd.value}
                size="small"
                variant={isActive ? 'contained' : 'outlined'}
                disableElevation
                onClick={() => setLocalDate(qd.value)}
                sx={{
                  flex: 1, borderRadius: '10px', fontWeight: 'bold', fontSize: '13px',
                  py: 0.8,
                  ...(isActive
                    ? {}
                    : { borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', backgroundColor: 'primary.lighter' } }),
                }}
              >
                {qd.label}
              </Button>
            );
          })}
        </Box>

        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          日付
        </Typography>
        <TextField
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          fullWidth size="small"
          slotProps={{
            htmlInput: { style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } },
          }}
          sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
        />
        {localDate && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mb: 2, pl: 0.5 }}>
            {formatDateLabel(localDate)}
          </Typography>
        )}

        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
          時刻
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            fullWidth size="small"
            slotProps={{
              htmlInput: { step: 60, style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Button
            size="small" variant="outlined"
            onClick={handleNow}
            sx={{ borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', py: 0.8, px: 1.5, minWidth: 0, whiteSpace: 'nowrap', color: 'text.primary', borderColor: 'divider' }}
          >
            現在
          </Button>
        </Box>

        {localDate && localTime && (
          <Box sx={{ mt: 2.5, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
              {formatDatetime(combineDatetime(localDate, localTime))}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={handleConfirm} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 勉強時間入力ダイアログ
// ==========================================
function DurationDialog({
  open, onClose, hours, minutes, onConfirm,
}: {
  open: boolean; onClose: () => void;
  hours: string; minutes: string;
  onConfirm: (h: string, m: string) => void;
}) {
  const theme = useTheme();
  const [localH, setLocalH] = useState(hours);
  const [localM, setLocalM] = useState(minutes);
  useEffect(() => { if (open) { setLocalH(hours); setLocalM(minutes); } }, [open, hours, minutes]);

  const total = (parseInt(localH || '0') * 60) + parseInt(localM || '0');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none'  } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習時間を入力</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <TextField
            type="number" value={localH}
            onChange={(e) => setLocalH(e.target.value)}
            size="small" label="時間"
            slotProps={{
              htmlInput: { min: 0, max: 24, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', flexShrink: 0 }}>:</Typography>
          <TextField
            type="number" value={localM}
            onChange={(e) => setLocalM(e.target.value)}
            size="small" label="分"
            slotProps={{
              htmlInput: { min: 0, max: 59, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
        </Box>
        {total > 0 && (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
              合計 {formatDuration(total)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={() => { onConfirm(localH, localM); onClose(); }} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 学習量入力ダイアログ
// ==========================================
interface PagesData {
  mode: 'total' | 'range';
  total: string;
  rangeStart: string;
  rangeEnd: string;
}

function PagesDialog({
  open, onClose, value, unit, onConfirm,
}: {
  open: boolean; onClose: () => void;
  value: PagesData; unit: string;
  onConfirm: (v: PagesData) => void;
}) {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [localTotal, setLocalTotal] = useState(value.total);
  const [localStart, setLocalStart] = useState(value.rangeStart);
  const [localEnd, setLocalEnd] = useState(value.rangeEnd);

  useEffect(() => {
    if (open) {
      setTabIndex(value.mode === 'range' ? 1 : 0);
      setLocalTotal(value.total);
      setLocalStart(value.rangeStart);
      setLocalEnd(value.rangeEnd);
    }
  }, [open, value]);

  const rangeValid =
    localStart !== '' && localEnd !== '' &&
    parseInt(localEnd) >= parseInt(localStart);

  const rangeHasInput = localStart !== '' || localEnd !== '';
  const rangeAmount = rangeValid ? parseInt(localEnd) - parseInt(localStart) : 0;

  const canConfirm = tabIndex === 0
    ? true
    : (!rangeHasInput || rangeValid);

  const handleConfirm = () => {
    if (tabIndex === 0) {
      onConfirm({ mode: 'total', total: localTotal, rangeStart: '', rangeEnd: '' });
    } else {
      if (rangeHasInput && !rangeValid) return;
      onConfirm({
        mode: 'range',
        total: rangeValid ? String(rangeAmount) : '',
        rangeStart: localStart,
        rangeEnd: localEnd,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習量を入力</DialogTitle>
      <DialogContent>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          sx={{ mb: 2, minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, color: 'text.secondary' } }}
        >
          <Tab label="合計" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
          <Tab label="範囲" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
        </Tabs>

        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <TextField
              type="number" value={localTotal}
              onChange={(e) => setLocalTotal(e.target.value)}
              size="small" fullWidth
              slotProps={{
                htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
            />
            <Typography sx={{ fontWeight: 'bold', color: 'text.secondary', flexShrink: 0 }}>{unit}</Typography>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  開始
                </Typography>
                <TextField
                  type="number" value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 1"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
                />
              </Box>
              <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', mt: 2.5, flexShrink: 0 }}>〜</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>
                  終了
                </Typography>
                <TextField
                  type="number" value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 10"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
                />
              </Box>
            </Box>

            {rangeHasInput && !rangeValid && localStart !== '' && localEnd !== '' && (
              <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                終了は開始以上の数値を入力してください
              </Typography>
            )}

            {rangeValid && rangeAmount > 0 && (
              <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>
                  {localStart} 〜 {localEnd}（合計: {rangeAmount} {unit}）
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button
          onClick={handleConfirm}
          variant="contained" disableElevation
          disabled={!canConfirm}
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}
        >
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// コンパクトなセル
// ==========================================
function CompactCell({
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

// ==========================================
// 手動入力タブ
// ==========================================
function ManualInputTab({
  selectedMaterial, onOpenMaterialDialog, isSaving, onSave,
  presetHours, presetMinutes,
  saveFnRef,
  onTotalMinutesChange,
  onDirtyChange,
}: {
  selectedMaterial: Material | null | 'none';
  onOpenMaterialDialog: () => void;
  isSaving: boolean;
  onSave: (datetime: string, hours: string, minutes: string, pages: string, memo: string, image: File | null) => void;
  presetHours: string;
  presetMinutes: string;
  saveFnRef: React.MutableRefObject<(() => void) | null>;
  onTotalMinutesChange: (n: number) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const theme = useTheme();
  const [recordDatetime, setRecordDatetime] = useState(nowDatetimeLocal);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [pagesData, setPagesData] = useState<PagesData>({ mode: 'total', total: '', rangeStart: '', rangeEnd: '' });
  const [memo, setMemo] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [isPagesDialogOpen, setIsPagesDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presetHours !== '' || presetMinutes !== '') {
      setHours(presetHours);
      setMinutes(presetMinutes);
    }
  }, [presetHours, presetMinutes]);

  const totalMinutes = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');

  const currentUnit =
    selectedMaterial && selectedMaterial !== 'none'
      ? (selectedMaterial as Material).unit
      : 'ページ';

  const hasMaterialSelected = selectedMaterial !== null && selectedMaterial !== 'none';

  const pagesDisplayValue = (() => {
    if (pagesData.mode === 'range' && pagesData.rangeStart && pagesData.rangeEnd) {
      const amount = parseInt(pagesData.rangeEnd) - parseInt(pagesData.rangeStart);
      if (amount >= 0) return `${pagesData.rangeStart} 〜 ${pagesData.rangeEnd}（${amount} ${currentUnit}）`;
    }
    if (pagesData.total && parseInt(pagesData.total) > 0) {
      return `${pagesData.total} ${currentUnit}`;
    }
    return undefined;
  })();

  const pagesHighlight = !!pagesDisplayValue;

  useEffect(() => {
    if (!hasMaterialSelected) {
      setPagesData({ mode: 'total', total: '', rangeStart: '', rangeEnd: '' });
    }
  }, [hasMaterialSelected]);

  useEffect(() => {
    saveFnRef.current = () => onSave(recordDatetime, hours, minutes, pagesData.total, memo, image);
  });

  useEffect(() => {
    onTotalMinutesChange(totalMinutes);
  }, [totalMinutes, onTotalMinutesChange]);

  useEffect(() => {
    const dirty = totalMinutes > 0
      || (pagesData.total !== '' && parseInt(pagesData.total) > 0)
      || memo.length > 0
      || image !== null;
    onDirtyChange(dirty);
  }, [totalMinutes, pagesData, memo, image, onDirtyChange]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const materialLabel = () => {
    if (selectedMaterial === 'none') return '教材なし';
    if (selectedMaterial) return (selectedMaterial as Material).name;
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', pt: 2 }}>

      <ListItemButton onClick={onOpenMaterialDialog} sx={{
        borderRadius: '16px',
        border: selectedMaterial ? '2px solid' : '1px solid',
        borderColor: selectedMaterial ? 'primary.main' : 'divider',
        backgroundColor: selectedMaterial ? 'primary.lighter' : 'background.subtle',
        mb: 1.5, px:  { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 }, minHeight: { xs: '100px', sm: '120px' }, transition: '0.15s',
        '&:hover': { backgroundColor: 'action.hover', borderColor: 'primary.main' },
      }}>
        <ListItemIcon sx={{ minWidth: { xs: 60, sm: 80 }, mr: 2, color: selectedMaterial ? 'primary.main' : 'text.disabled', justifyContent: 'center' }}>
          {selectedMaterial && selectedMaterial !== 'none' ? (
            <img src={(selectedMaterial as Material).image} alt=""
              style={{ height: '80px', maxWidth: '80px', objectFit: 'contain' }} />
          ) : (
            <MenuBookOutlinedIcon sx={{ fontSize: { xs: '36px', sm: '48px' } }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedMaterial && selectedMaterial !== 'none' && (
                <Chip label={(selectedMaterial as Material).categoryName} size="small" sx={{
                  backgroundColor: (selectedMaterial as Material).colorCode, color: 'error.contrastText',
                  fontSize: '11px', height: '22px', fontWeight: 'bold', alignSelf: 'flex-start',
                }} />
              )}
              <Typography sx={{
                fontWeight: 'bold', fontSize: '18px',
                color: selectedMaterial ? 'primary.main' : 'text.disabled',
                lineHeight: 1.3,
              }}>
                {materialLabel() ?? '教材を選択'}
              </Typography>
              {!selectedMaterial && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  記録するには教材を選択してください
                </Typography>
              )}
            </Box>
          }
        />
        <KeyboardArrowRightIcon sx={{ color: selectedMaterial ? 'primary.main' : 'text.disabled', fontSize: '28px' }} />
      </ListItemButton>

      <CompactCell
        icon={<CalendarTodayOutlinedIcon fontSize="small" />}
        value={formatDatetime(recordDatetime)}
        placeholder="日付・時刻を選択"
        onClick={() => setIsDateDialogOpen(true)}
      />

      <CompactCell
        icon={<AccessTimeIcon fontSize="small" />}
        value={totalMinutes > 0 ? formatDuration(totalMinutes) : undefined}
        placeholder="学習時間を入力"
        onClick={() => setIsDurationDialogOpen(true)}
        highlight={totalMinutes > 0}
      />

      {hasMaterialSelected && (
        <CompactCell
          icon={<MenuBookRoundedIcon fontSize="small" />}
          value={pagesDisplayValue}
          placeholder={`学習量を入力（${currentUnit}）`}
          onClick={() => setIsPagesDialogOpen(true)}
          highlight={pagesHighlight}
        />
      )}

      <Divider sx={{ my: 1 }} />

      <Box sx={{ mt: 1, mb: 1.5 }}>
        <TextField
          placeholder="要点・ひとことメモ" value={memo}
          onChange={(e) => setMemo(e.target.value)}
          fullWidth multiline rows={3} disabled={isSaving}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle', color: 'text.primary' } }}
        />
      </Box>

      <input
        type="file" accept="image/*" ref={fileInputRef}
        style={{ display: 'none' }} onChange={handleImageChange}
      />
      {image && previewUrl ? (
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            borderRadius: '12px', border: '2px solid',
            borderColor: 'primary.main',
            backgroundColor: 'primary.lighter', mb: 1.5, px: 2, py: 1.5,
            cursor: 'pointer', transition: '0.15s',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <img src={previewUrl} alt="preview"
            style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
          <Typography sx={{
            fontWeight: 'bold', fontSize: '13px', color: 'primary.main', flexGrow: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {image.name}
          </Typography>
          <KeyboardArrowRightIcon sx={{ color: 'primary.main', fontSize: '20px' }} />
        </Box>
      ) : (
        <CompactCell
          icon={<ImageOutlinedIcon fontSize="small" />}
          placeholder="画像を添付"
          onClick={() => fileInputRef.current?.click()}
        />
      )}

      <DateDialog
        open={isDateDialogOpen} onClose={() => setIsDateDialogOpen(false)}
        value={recordDatetime} onChange={setRecordDatetime}
      />
      <DurationDialog
        open={isDurationDialogOpen} onClose={() => setIsDurationDialogOpen(false)}
        hours={hours} minutes={minutes}
        onConfirm={(h, m) => { setHours(h); setMinutes(m); }}
      />
      <PagesDialog
        open={isPagesDialogOpen} onClose={() => setIsPagesDialogOpen(false)}
        value={pagesData} unit={currentUnit}
        onConfirm={setPagesData}
      />
    </Box>
  );
}

// ==========================================
// ストップウォッチタブ
// ==========================================
function StopwatchTab({
  selectedMaterial, onOpenMaterialDialog, onUseTime,
  useFnRef, pauseFnRef,
  onStateChange,
}: {
  selectedMaterial: Material | null | 'none';
  onOpenMaterialDialog: () => void;
  onUseTime: (totalMinutes: number) => void;
  useFnRef: React.MutableRefObject<(() => void) | null>;
  pauseFnRef: React.MutableRefObject<(() => void) | null>;
  onStateChange: (elapsed: number, isRunning: boolean) => void;
}) {
  const theme = useTheme();

  const savedIsRunning = localStorage.getItem('studylog_sw_isRunning') === 'true';
  const savedStartTime = parseInt(localStorage.getItem('studylog_sw_startTime') || '0');
  const savedAccum = parseInt(localStorage.getItem('studylog_sw_accumulated') || '0');

  const clearSwStorage = () => {
    localStorage.removeItem('studylog_sw_isRunning');
    localStorage.removeItem('studylog_sw_startTime');
    localStorage.removeItem('studylog_sw_accumulated');
  };

  const [isRunning, setIsRunning] = useState(savedIsRunning);
  const [elapsed, setElapsed] = useState(() =>
    savedIsRunning && savedStartTime > 0
      ? Math.floor((Date.now() - savedStartTime) / 1000) + savedAccum
      : savedAccum
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(savedIsRunning ? savedStartTime : 0);
  const accumulatedRef = useRef<number>(savedAccum);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + accumulatedRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    useFnRef.current = () => {
      clearSwStorage();
      onUseTime(Math.ceil(elapsed / 60));
    };
    pauseFnRef.current = () => {
      accumulatedRef.current = elapsed;
      localStorage.setItem('studylog_sw_isRunning', 'false');
      localStorage.setItem('studylog_sw_accumulated', String(elapsed));
      setIsRunning(false);
    };
  });

  useEffect(() => {
    onStateChange(elapsed, isRunning);
  }, [elapsed, isRunning, onStateChange]);

  const handleReset = () => {
    setIsRunning(false);
    accumulatedRef.current = 0;
    setElapsed(0);
    clearSwStorage();
  };

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const materialLabel = () => {
    if (selectedMaterial === 'none') return '教材なし';
    if (selectedMaterial) return (selectedMaterial as Material).name;
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pt: 2 }}>

      <ListItemButton onClick={onOpenMaterialDialog} sx={{
        borderRadius: '16px',
        border: selectedMaterial ? '2px solid' : '1px solid',
        borderColor: selectedMaterial ? 'primary.main' : 'divider',
        backgroundColor: selectedMaterial ? 'primary.lighter' : 'background.subtle',
        mb: 1.5, px: 3, py: 3, minHeight: '120px', transition: '0.15s',
        '&:hover': { backgroundColor: 'action.hover', borderColor: 'primary.main' },
      }}>
        <ListItemIcon sx={{ minWidth: 80, mr: 2, color: selectedMaterial ? 'primary.main' : 'text.disabled', justifyContent: 'center' }}>
          {selectedMaterial && selectedMaterial !== 'none' ? (
            <img src={(selectedMaterial as Material).image} alt=""
              style={{ height: '80px', maxWidth: '80px', objectFit: 'contain' }} />
          ) : (
            <MenuBookOutlinedIcon sx={{ fontSize: '48px' }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedMaterial && selectedMaterial !== 'none' && (
                <Chip label={(selectedMaterial as Material).categoryName} size="small" sx={{
                  backgroundColor: (selectedMaterial as Material).colorCode, color: 'error.contrastText',
                  fontSize: '11px', height: '22px', fontWeight: 'bold', alignSelf: 'flex-start',
                }} />
              )}
              <Typography sx={{
                fontWeight: 'bold', fontSize: '18px',
                color: selectedMaterial ? 'primary.main' : 'text.disabled',
                lineHeight: 1.3,
              }}>
                {materialLabel() ?? '教材を選択'}
              </Typography>
              {!selectedMaterial && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  記録するには教材を選択してください
                </Typography>
              )}
            </Box>
          }
        />
        <KeyboardArrowRightIcon sx={{ color: selectedMaterial ? 'primary.main' : 'text.disabled', fontSize: '28px' }} />
      </ListItemButton>

      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        py: 5, px: 3, backgroundColor: 'background.subtle', borderRadius: '20px',
        border: '1px solid', borderColor: 'divider', gap: 4,
      }}>
        <Typography sx={{
          fontSize: 'clamp(56px, 10vw, 88px)', fontWeight: '300',
          letterSpacing: '-2px', lineHeight: 1,
          color: isRunning ? 'primary.main' : elapsed > 0 ? 'text.primary' : 'text.disabled',
          fontFamily: '"Roboto Mono", monospace',
          transition: 'color 0.3s',
        }}>
          {formatTime(elapsed)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleReset} disabled={elapsed === 0}
            sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', width: 52, height: 52, '&:hover': { backgroundColor: 'action.hover' }, color: 'text.primary' }}>
            <ReplayRoundedIcon />
          </IconButton>
          <IconButton onClick={() => {
            if (isRunning) {
              accumulatedRef.current = elapsed;
              localStorage.setItem('studylog_sw_isRunning', 'false');
              localStorage.setItem('studylog_sw_accumulated', String(elapsed));
              setIsRunning(false);
            } else {
              startTimeRef.current = Date.now();
              localStorage.setItem('studylog_sw_isRunning', 'true');
              localStorage.setItem('studylog_sw_startTime', String(startTimeRef.current));
              setIsRunning(true);
            }
          }} sx={{
            width: 72, height: 72,
            backgroundColor: isRunning ? 'error.main' : 'primary.main', color: 'error.contrastText',
            '&:hover': { backgroundColor: isRunning ? 'error.dark' : 'primary.dark' },
          }}>
            {isRunning ? <PauseRoundedIcon sx={{ fontSize: '36px' }} /> : <PlayArrowRoundedIcon sx={{ fontSize: '36px' }} />}
          </IconButton>
          <Box sx={{ width: 52 }} />
        </Box>
      </Box>
    </Box>
  );
}

// ==========================================
// メインコンポーネント
// ==========================================
export default function Record({ onRecordSaved }: { onRecordSaved?: () => void }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(() => {
    const saved = localStorage.getItem('studylog_record_tab');
    return saved === '1' ? 1 : 0;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null | 'none'>(null);
  const [presetHours, setPresetHours] = useState('');
  const [presetMinutes, setPresetMinutes] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [swElapsed, setSwElapsed] = useState(0);
  const [swIsRunning, setSwIsRunning] = useState(false);

  const manualSaveFnRef = useRef<(() => void) | null>(null);
  const swUseFnRef = useRef<(() => void) | null>(null);
  const swPauseFnRef = useRef<(() => void) | null>(null);
  const isSaveNavigatingRef = useRef(false);

  const [manualIsDirty, setManualIsDirty] = useState(false);
  const handleManualDirtyChange = useCallback((dirty: boolean) => {
    setManualIsDirty(dirty);
  }, []);

  const navigate = useNavigate();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar((s) => ({ ...s, open: false }));

  const [savePopupOpen, setSavePopupOpen] = useState(false);
  const [savePopupLabel, setSavePopupLabel] = useState('');

  const headerButtonDisabled =
    tabIndex === 0
      ? (isSaving || selectedMaterial === null)
      : (swElapsed === 0 || swIsRunning || selectedMaterial === null);

  const handleHeaderAction = () => {
    if (tabIndex === 0) {
      manualSaveFnRef.current?.();
    } else {
      swUseFnRef.current?.();
    }
  };

  const handleTotalMinutesChange = useCallback((n: number) => {
    // manualTotalMinutes is removed as it's not used in parent
  }, []);

  const handleSwStateChange = useCallback((elapsed: number, isRunning: boolean) => {
    setSwElapsed(elapsed);
    setSwIsRunning(isRunning);
  }, []);

  const shouldBlock = !isSaveNavigatingRef.current && (manualIsDirty || swElapsed > 0);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0 && swIsRunning) {
      swPauseFnRef.current?.();
    }
    setTabIndex(newValue);
    localStorage.setItem('studylog_record_tab', String(newValue));
  };

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('materials')
        .select('id, title, image_url, unit, categories ( name, color_code, sort_order )')
        .eq('status', 'active')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setMaterials(data.map((item: any) => ({
          id: item.id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || theme.palette.divider,
          sortOrder: item.categories?.sort_order || 0,
          unit: item.unit || 'ページ',
        })));
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleUseStopwatchTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    setPresetHours(h > 0 ? String(h) : '');
    setPresetMinutes(String(m));
    setTabIndex(0);
    localStorage.setItem('studylog_record_tab', '0');
  };

  const handleSave = async (
    datetime: string, hours: string, minutes: string,
    pages: string, memo: string, image: File | null,
  ) => {
    if (selectedMaterial === null) return;

    const totalMinutes = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let imageUrl: string | null = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('study-logs').upload(`public/${fileName}`, image);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('study-logs').getPublicUrl(`public/${fileName}`);
        imageUrl = urlData.publicUrl;
      }

      const materialId = selectedMaterial !== 'none'
        ? (selectedMaterial as Material).id : null;

      const { error } = await supabase.from('study_logs').insert([{
        user_id: user.id,
        material_id: materialId,
        study_datetime: new Date(datetime).toISOString(),
        duration_minutes: totalMinutes > 0 ? totalMinutes : null,
        pages: pages ? parseInt(pages) : null,
        memo: memo.trim() || null,
        image_url: imageUrl,
      }]);
      if (error) throw error;

      const label = selectedMaterial === 'none'
        ? '教材なし'
        : (selectedMaterial as Material).name;

      setSelectedMaterial(null);
      setPresetHours('');
      setPresetMinutes('');
      setManualIsDirty(false);
      onRecordSaved?.();

      setSavePopupLabel(label);
      setSavePopupOpen(true);
      isSaveNavigatingRef.current = true;
      setTimeout(() => {
        setSavePopupOpen(false);
        navigate('/report');
      }, 1500);
    } catch (error) {
      console.error('保存エラー:', error);
      isSaveNavigatingRef.current = false;
      showSnackbar('保存に失敗しました。時間をおいて再度お試しください。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', flexDirection: 'column', minHeight: 0, 
      maxWidth: '1100px', margin: '0 auto', width: '100%' 
    }}>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isMobile ? 2 : 4, color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
            <ModeEditOutlineOutlinedIcon />
          </Box>
          <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>記録の入力</Typography>
        </Box>
        <Button
          variant="contained"
          size={isMobile ? 'medium' : 'large'}
          disableElevation
          disabled={headerButtonDisabled}
          onClick={handleHeaderAction}
          sx={{ borderRadius: '5px', fontWeight: 'bold', px: isMobile ? 2 : 3, boxShadow: 'none' }}
        >
          {tabIndex === 0 ? '記録する' : '完了'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: isMobile ? 0 : 4 }}>
        <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" sx={{ '& .MuiTab-root': { color: 'text.secondary' } }}>
          <Tab
            icon={<ModeEditOutlineOutlinedIcon />}
            iconPosition="start"
            label="手動入力"
            sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', minHeight: { xs: '48px', sm: '56px' }, whiteSpace: 'nowrap' }}
          />
          <Tab
            icon={<TimerOutlinedIcon />}
            iconPosition="start"
            label="ストップウォッチ"
            sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0', minHeight: { xs: '48px', sm: '56px' }, whiteSpace: 'nowrap' }}
          />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: isMobile ? 0 : 3, px: isMobile ? 0 : 1 }}>
        <Box sx={{ display: tabIndex === 0 ? 'block' : 'none' }}>
          <ManualInputTab
            selectedMaterial={selectedMaterial}
            onOpenMaterialDialog={() => setIsDialogOpen(true)}
            isSaving={isSaving}
            onSave={handleSave}
            presetHours={presetHours}
            presetMinutes={presetMinutes}
            saveFnRef={manualSaveFnRef}
            onTotalMinutesChange={handleTotalMinutesChange}
            onDirtyChange={handleManualDirtyChange}
          />
        </Box>
        <Box sx={{ display: tabIndex === 1 ? 'block' : 'none' }}>
          <StopwatchTab
            selectedMaterial={selectedMaterial}
            onOpenMaterialDialog={() => setIsDialogOpen(true)}
            onUseTime={handleUseStopwatchTime}
            useFnRef={swUseFnRef}
            pauseFnRef={swPauseFnRef}
            onStateChange={handleSwStateChange}
          />
        </Box>
      </Box>

      <MaterialSelectDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        materials={materials}
        isLoading={isLoading}
        currentMaterial={selectedMaterial}
        onSelect={setSelectedMaterial}
      />

      <Fade in={savePopupOpen} timeout={300}>
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'background.overlay',
          pointerEvents: 'none',
        }}>
          <Box sx={{
            backgroundColor: 'background.paper',
            borderRadius: '24px',
            px: { xs: 4, sm: 5 }, py: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            boxShadow: theme.customShadows.lg,
            minWidth: { xs: '200px', sm: '260px' },
          }}>
            <CheckCircleOutlineIcon sx={{ fontSize: '64px', color: 'success.main' }} />
            <Typography sx={{ fontWeight: 'bold', fontSize: '20px', color: 'text.primary' }}>
              記録しました！
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              {savePopupLabel}
            </Typography>
          </Box>
        </Box>
      </Fade>

      <NavigationBlockerDialog
        open={blocker.state === 'blocked'}
        onProceed={() => {
          localStorage.removeItem('studylog_sw_isRunning');
          localStorage.removeItem('studylog_sw_startTime');
          localStorage.removeItem('studylog_sw_accumulated');
          blocker.proceed?.();
        }}
        onCancel={() => blocker.reset?.()}
        message={
          swElapsed > 0 && manualIsDirty
            ? '入力中のデータとストップウォッチの計測データが失われます。\nこのページを離れますか？'
            : swElapsed > 0
              ? 'ストップウォッチの計測データが失われます。\nこのページを離れますか？'
              : '入力内容が保存されていません。\nこのページを離れると、入力内容が破棄されます。'
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}