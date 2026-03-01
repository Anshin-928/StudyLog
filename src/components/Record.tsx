// src/components/Record.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, TextField, Button,
  Card, CardMedia, CardContent, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Divider, ListItemButton, ListItemText, ListItemIcon,
  Snackbar, Alert,
} from '@mui/material';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
import { supabase } from '../lib/supabase';

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
  return (
    <Card
      onClick={() => onSelect(material)}
      sx={{
        height: '200px', width: '140px',
        display: 'flex', flexDirection: 'column',
        borderRadius: '12px', cursor: 'pointer',
        transition: 'all 0.18s', position: 'relative',
        border: isSelected ? '2.5px solid #1A73E8' : '0.5px solid rgba(0,0,0,0.13)',
        boxShadow: isSelected ? '0 0 0 3px rgba(26,115,232,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 14px rgba(0,0,0,0.13)' },
      }}
    >
      {isSelected && (
        <CheckCircleIcon sx={{
          position: 'absolute', top: 6, right: 6,
          color: '#1A73E8', fontSize: '20px',
          backgroundColor: '#fff', borderRadius: '50%', zIndex: 1,
        }} />
      )}
      <Box sx={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1.5 }}>
        <CardMedia
          component="img"
          sx={{ height: '100%', maxHeight: '110px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
          image={material.image} alt={material.name}
        />
      </Box>
      <CardContent sx={{
        p: 1.5, flexGrow: 1,
        backgroundColor: isSelected ? '#f0f4fd' : '#fff',
        borderRadius: '0 0 12px 12px',
      }}>
        <Typography variant="caption" sx={{
          fontWeight: 'bold', fontSize: '11px', lineHeight: 1.3,
          display: '-webkit-box', overflow: 'hidden',
          WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
          color: isSelected ? '#1A73E8' : '#333',
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', height: '80vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, fontWeight: 'bold' }}>
        教材を選択
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ flexGrow: 1, overflowY: 'auto', px: 3, pt: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box onClick={() => { onSelect('none'); onClose(); }} sx={{
              mb: 3, p: 2, border: isNoneSelected ? '2px solid #1A73E8' : '1.5px dashed #ccc',
              borderRadius: '12px', cursor: 'pointer',
              backgroundColor: isNoneSelected ? '#f0f4fd' : '#fafafa',
              display: 'flex', alignItems: 'center', gap: 1.5, transition: '0.15s',
              '&:hover': { borderColor: '#1A73E8', backgroundColor: '#f0f4fd' },
            }}>
              {isNoneSelected && <CheckCircleIcon sx={{ color: '#1A73E8', fontSize: '20px' }} />}
              <Box>
                <Typography sx={{ fontWeight: 'bold', color: isNoneSelected ? '#1A73E8' : '#555', fontSize: '14px' }}>
                  教材を選択しない
                </Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>「教材なし」として記録します</Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 3 }} />
            {sortedCategoryEntries.map(([categoryName, items]) => (
              <Box key={categoryName} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 'bold', color: '#333', mb: 1.5, pl: 1,
                  borderLeft: `4px solid ${items[0]?.colorCode || '#1A73E8'}`,
                }}>
                  {categoryName}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
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
// 日付・時刻選択ダイアログ（改善版）
// ==========================================
function DateDialog({
  open, onClose, value, onChange,
}: {
  open: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) {
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
  const twoDaysAgo = daysAgo(2);

  const quickDates = [
    { label: '今日', value: today },
    { label: '昨日', value: yesterday },
    { label: '一昨日', value: twoDaysAgo },
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
      PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>日付・時刻を選択</DialogTitle>
      <DialogContent>
        {/* クイック日付ボタン */}
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
                    : { borderColor: '#e0e0e0', color: '#555', '&:hover': { borderColor: '#1A73E8', backgroundColor: '#f0f4fd' } }),
                }}
              >
                {qd.label}
              </Button>
            );
          })}
        </Box>

        {/* 日付入力 */}
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', mb: 0.5, display: 'block' }}>
          日付
        </Typography>
        <TextField
          type="date"
          value={localDate}
          onChange={(e) => setLocalDate(e.target.value)}
          fullWidth size="small"
          slotProps={{
            htmlInput: { style: { fontSize: '16px', fontWeight: 'bold' } },
          }}
          sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
        />
        {localDate && (
          <Typography variant="caption" sx={{ color: '#1A73E8', fontWeight: 'bold', display: 'block', mb: 2, pl: 0.5 }}>
            {formatDateLabel(localDate)}
          </Typography>
        )}

        {/* 時刻入力 */}
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', mb: 0.5, display: 'block' }}>
          時刻
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            fullWidth size="small"
            slotProps={{
              htmlInput: { step: 60, style: { fontSize: '16px', fontWeight: 'bold' } },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
          />
          <Button
            size="small" variant="outlined"
            onClick={handleNow}
            sx={{ borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', py: 0.8, px: 1.5, minWidth: 0, whiteSpace: 'nowrap' }}
          >
            現在
          </Button>
        </Box>

        {/* プレビュー */}
        {localDate && localTime && (
          <Box sx={{ mt: 2.5, p: 1.5, backgroundColor: '#e8f0fe', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: '#1A73E8' }}>
              {formatDatetime(combineDatetime(localDate, localTime))}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#666', fontWeight: 'bold' }}>キャンセル</Button>
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
  const [localH, setLocalH] = useState(hours);
  const [localM, setLocalM] = useState(minutes);
  useEffect(() => { if (open) { setLocalH(hours); setLocalM(minutes); } }, [open, hours, minutes]);

  const total = (parseInt(localH || '0') * 60) + parseInt(localM || '0');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>学習時間を入力</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <TextField
            type="number" value={localH}
            onChange={(e) => setLocalH(e.target.value)}
            size="small" label="時間"
            slotProps={{
              htmlInput: { min: 0, max: 24, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold' } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
          />
          <Typography sx={{ fontWeight: 'bold', color: '#aaa', fontSize: '20px', flexShrink: 0 }}>:</Typography>
          <TextField
            type="number" value={localM}
            onChange={(e) => setLocalM(e.target.value)}
            size="small" label="分"
            slotProps={{
              htmlInput: { min: 0, max: 59, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold' } },
            }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
          />
        </Box>
        {total > 0 && (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#e8f0fe', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: '#1A73E8' }}>
              合計 {formatDuration(total)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#666', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={() => { onConfirm(localH, localM); onClose(); }} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 学習量入力ダイアログ（合計 / 範囲 タブ付き）
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
      PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>学習量を入力</DialogTitle>
      <DialogContent>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
          sx={{ mb: 2, minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5 } }}
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
                htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold' } },
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
            />
            <Typography sx={{ fontWeight: 'bold', color: '#666', flexShrink: 0 }}>{unit}</Typography>
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', mb: 0.5, display: 'block' }}>
                  開始
                </Typography>
                <TextField
                  type="number" value={localStart}
                  onChange={(e) => setLocalStart(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 1"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold' } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
                />
              </Box>
              <Typography sx={{ fontWeight: 'bold', color: '#aaa', fontSize: '20px', mt: 2.5, flexShrink: 0 }}>〜</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#888', mb: 0.5, display: 'block' }}>
                  終了
                </Typography>
                <TextField
                  type="number" value={localEnd}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  size="small" fullWidth
                  placeholder="例: 10"
                  slotProps={{
                    htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold' } },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
                />
              </Box>
            </Box>

            {rangeHasInput && !rangeValid && localStart !== '' && localEnd !== '' && (
              <Typography variant="caption" sx={{ color: '#d32f2f', mt: 1, display: 'block' }}>
                終了は開始以上の数値を入力してください
              </Typography>
            )}

            {rangeValid && rangeAmount > 0 && (
              <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#e8f0fe', borderRadius: '10px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: '#1A73E8' }}>
                  {localStart} 〜 {localEnd}（合計: {rangeAmount} {unit}）
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#666', fontWeight: 'bold' }}>キャンセル</Button>
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
        border: highlight ? '2px solid #1A73E8' : '1px solid #e8e8e8',
        backgroundColor: highlight ? '#f0f4fd' : '#fafafa',
        mb: 1.5, px: 2,
        height: '48px',
        transition: '0.15s', cursor: 'pointer',
        '&:hover': { backgroundColor: highlight ? '#e8f0fe' : '#f0f0f0', borderColor: '#1A73E8' },
      }}
      onClick={onClick}
    >
      <Box sx={{ color: highlight ? '#1A73E8' : '#aaa', display: 'flex', mr: 1.5, flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography sx={{
        flexGrow: 1, fontWeight: 'bold', fontSize: '14px',
        color: hasValue ? (highlight ? '#1A73E8' : '#333') : '#bbb',
      }}>
        {value || placeholder}
      </Typography>
      {rightSlot ?? <KeyboardArrowRightIcon sx={{ color: highlight ? '#1A73E8' : '#bbb', fontSize: '20px', flexShrink: 0 }} />}
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
}: {
  selectedMaterial: Material | null | 'none';
  onOpenMaterialDialog: () => void;
  isSaving: boolean;
  onSave: (datetime: string, hours: string, minutes: string, pages: string, memo: string, image: File | null) => void;
  presetHours: string;
  presetMinutes: string;
  saveFnRef: React.MutableRefObject<(() => void) | null>;
  onTotalMinutesChange: (n: number) => void;
}) {
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

      {/* ========== 教材 ========== */}
      <ListItemButton onClick={onOpenMaterialDialog} sx={{
        borderRadius: '16px',
        border: selectedMaterial ? '2px solid #1A73E8' : '1px solid #e8e8e8',
        backgroundColor: selectedMaterial ? '#f0f4fd' : '#fafafa',
        mb: 1.5, px: 3, py: 3, minHeight: '120px', transition: '0.15s',
        '&:hover': { backgroundColor: selectedMaterial ? '#e8f0fe' : '#f0f0f0', borderColor: '#1A73E8' },
      }}>
        <ListItemIcon sx={{ minWidth: 80, mr: 2, color: selectedMaterial ? '#1A73E8' : '#aaa', justifyContent: 'center' }}>
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
                  backgroundColor: (selectedMaterial as Material).colorCode, color: '#fff',
                  fontSize: '11px', height: '22px', fontWeight: 'bold', alignSelf: 'flex-start',
                }} />
              )}
              <Typography sx={{
                fontWeight: 'bold', fontSize: '18px',
                color: selectedMaterial ? '#1A73E8' : '#bbb',
                lineHeight: 1.3,
              }}>
                {materialLabel() ?? '教材を選択'}
              </Typography>
              {!selectedMaterial && (
                <Typography variant="caption" sx={{ color: '#bbb' }}>
                  記録するには教材を選択してください
                </Typography>
              )}
            </Box>
          }
        />
        <KeyboardArrowRightIcon sx={{ color: selectedMaterial ? '#1A73E8' : '#bbb', fontSize: '28px' }} />
      </ListItemButton>

      {/* ========== 日付 ========== */}
      <CompactCell
        icon={<CalendarTodayOutlinedIcon fontSize="small" />}
        value={formatDatetime(recordDatetime)}
        placeholder="日付・時刻を選択"
        onClick={() => setIsDateDialogOpen(true)}
      />

      {/* ========== 勉強時間 ========== */}
      <CompactCell
        icon={<AccessTimeIcon fontSize="small" />}
        value={totalMinutes > 0 ? formatDuration(totalMinutes) : undefined}
        placeholder="学習時間を入力"
        onClick={() => setIsDurationDialogOpen(true)}
        highlight={totalMinutes > 0}
      />

      {/* ========== 学習量（教材が選択されている場合のみ） ========== */}
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

      {/* ========== メモ ========== */}
      <Box sx={{ mt: 1, mb: 1.5 }}>
        <TextField
          placeholder="要点・ひとことメモ" value={memo}
          onChange={(e) => setMemo(e.target.value)}
          fullWidth multiline rows={3} disabled={isSaving}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#f9f9f9' } }}
        />
      </Box>

      {/* ========== 画像 ========== */}
      <input
        type="file" accept="image/*" ref={fileInputRef}
        style={{ display: 'none' }} onChange={handleImageChange}
      />
      {image && previewUrl ? (
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            display: 'flex', alignItems: 'center', gap: 2,
            borderRadius: '12px', border: '2px solid #1A73E8',
            backgroundColor: '#f0f4fd', mb: 1.5, px: 2, py: 1.5,
            cursor: 'pointer', transition: '0.15s',
            '&:hover': { backgroundColor: '#e8f0fe' },
          }}
        >
          <img src={previewUrl} alt="preview"
            style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
          <Typography sx={{
            fontWeight: 'bold', fontSize: '13px', color: '#1A73E8', flexGrow: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {image.name}
          </Typography>
          <KeyboardArrowRightIcon sx={{ color: '#1A73E8', fontSize: '20px' }} />
        </Box>
      ) : (
        <CompactCell
          icon={<ImageOutlinedIcon fontSize="small" />}
          placeholder="画像を添付"
          onClick={() => fileInputRef.current?.click()}
        />
      )}

      {/* ダイアログ群 */}
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
  useFnRef,
  onStateChange,
}: {
  selectedMaterial: Material | null | 'none';
  onOpenMaterialDialog: () => void;
  onUseTime: (totalMinutes: number) => void;
  useFnRef: React.MutableRefObject<(() => void) | null>;
  onStateChange: (elapsed: number, isRunning: boolean) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    useFnRef.current = () => onUseTime(Math.ceil(elapsed / 60));
  });

  useEffect(() => {
    onStateChange(elapsed, isRunning);
  }, [elapsed, isRunning, onStateChange]);

  const handleReset = () => { setIsRunning(false); setElapsed(0); };

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

      {/* ========== 教材 ========== */}
      <ListItemButton onClick={onOpenMaterialDialog} sx={{
        borderRadius: '16px',
        border: selectedMaterial ? '2px solid #1A73E8' : '1px solid #e8e8e8',
        backgroundColor: selectedMaterial ? '#f0f4fd' : '#fafafa',
        mb: 1.5, px: 3, py: 3, minHeight: '120px', transition: '0.15s',
        '&:hover': { backgroundColor: selectedMaterial ? '#e8f0fe' : '#f0f0f0', borderColor: '#1A73E8' },
      }}>
        <ListItemIcon sx={{ minWidth: 80, mr: 2, color: selectedMaterial ? '#1A73E8' : '#aaa', justifyContent: 'center' }}>
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
                  backgroundColor: (selectedMaterial as Material).colorCode, color: '#fff',
                  fontSize: '11px', height: '22px', fontWeight: 'bold', alignSelf: 'flex-start',
                }} />
              )}
              <Typography sx={{
                fontWeight: 'bold', fontSize: '18px',
                color: selectedMaterial ? '#1A73E8' : '#bbb',
                lineHeight: 1.3,
              }}>
                {materialLabel() ?? '教材を選択'}
              </Typography>
              {!selectedMaterial && (
                <Typography variant="caption" sx={{ color: '#bbb' }}>
                  記録するには教材を選択してください
                </Typography>
              )}
            </Box>
          }
        />
        <KeyboardArrowRightIcon sx={{ color: selectedMaterial ? '#1A73E8' : '#bbb', fontSize: '28px' }} />
      </ListItemButton>

      {/* ストップウォッチ本体 */}
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        py: 5, px: 3, backgroundColor: '#f9f9f9', borderRadius: '20px',
        border: '1px solid #eee', gap: 4,
      }}>
        <Typography sx={{
          fontSize: 'clamp(56px, 10vw, 88px)', fontWeight: '300',
          letterSpacing: '-2px', lineHeight: 1,
          color: isRunning ? '#1A73E8' : elapsed > 0 ? '#333' : '#bbb',
          fontFamily: '"Roboto Mono", monospace',
          transition: 'color 0.3s',
        }}>
          {formatTime(elapsed)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleReset} disabled={elapsed === 0}
            sx={{ backgroundColor: '#fff', border: '1px solid #e0e0e0', width: 52, height: 52, '&:hover': { backgroundColor: '#f5f5f5' } }}>
            <ReplayRoundedIcon />
          </IconButton>
          <IconButton onClick={() => setIsRunning((r) => !r)} sx={{
            width: 72, height: 72,
            backgroundColor: isRunning ? '#d32f2f' : '#1A73E8', color: '#fff',
            '&:hover': { backgroundColor: isRunning ? '#b71c1c' : '#1557b0' },
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
  const [tabIndex, setTabIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null | 'none'>(null);
  const [presetHours, setPresetHours] = useState('');
  const [presetMinutes, setPresetMinutes] = useState('');

  const [manualTotalMinutes, setManualTotalMinutes] = useState(0);
  const [swElapsed, setSwElapsed] = useState(0);
  const [swIsRunning, setSwIsRunning] = useState(false);

  const manualSaveFnRef = useRef<(() => void) | null>(null);
  const swUseFnRef = useRef<(() => void) | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };
  const handleSnackbarClose = () => setSnackbar((s) => ({ ...s, open: false }));

  // ヘッダーボタンの disabled 条件
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
    setManualTotalMinutes(n);
  }, []);

  const handleSwStateChange = useCallback((elapsed: number, isRunning: boolean) => {
    setSwElapsed(elapsed);
    setSwIsRunning(isRunning);
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('materials')
        .select('id, title, image_url, unit, categories ( name, color_code, sort_order )')
        .eq('status', 'active')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setMaterials(data.map((item: any) => ({
          id: item.id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || '#e0e0e0',
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
        : `「${(selectedMaterial as Material).name}」`;
      showSnackbar(`${label}の記録を保存しました`, 'success');
      onRecordSaved?.();

      setSelectedMaterial(null);
      setPresetHours('');
      setPresetMinutes('');
    } catch (error) {
      console.error('保存エラー:', error);
      showSnackbar('保存に失敗しました。時間をおいて再度お試しください。', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, color: '#333' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: '32px' } }}>
            <ModeEditOutlineOutlinedIcon />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>記録の入力</Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          disableElevation
          disabled={headerButtonDisabled}
          onClick={handleHeaderAction}
          sx={{ borderRadius: '5px', fontWeight: 'bold', px: 3, boxShadow: 'none' }}
        >
          {tabIndex === 0 ? '記録する' : '完了'}
        </Button>
      </Box>

      {/* タブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="fullWidth">
          <Tab icon={<ModeEditOutlineOutlinedIcon />} iconPosition="start" label="手動入力" sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0' }} />
          <Tab icon={<TimerOutlinedIcon />} iconPosition="start" label="ストップウォッチ" sx={{ fontWeight: 'bold', borderRadius: '12px 12px 0 0' }} />
        </Tabs>
      </Box>

      {/* タブコンテンツ */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 3, px: 1 }}>
        {tabIndex === 0 && (
          <ManualInputTab
            selectedMaterial={selectedMaterial}
            onOpenMaterialDialog={() => setIsDialogOpen(true)}
            isSaving={isSaving}
            onSave={handleSave}
            presetHours={presetHours}
            presetMinutes={presetMinutes}
            saveFnRef={manualSaveFnRef}
            onTotalMinutesChange={handleTotalMinutesChange}
          />
        )}
        {tabIndex === 1 && (
          <StopwatchTab
            selectedMaterial={selectedMaterial}
            onOpenMaterialDialog={() => setIsDialogOpen(true)}
            onUseTime={handleUseStopwatchTime}
            useFnRef={swUseFnRef}
            onStateChange={handleSwStateChange}
          />
        )}
      </Box>

      {/* 教材選択モーダル */}
      <MaterialSelectDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        materials={materials}
        isLoading={isLoading}
        currentMaterial={selectedMaterial}
        onSelect={setSelectedMaterial}
      />

      {/* Snackbar */}
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