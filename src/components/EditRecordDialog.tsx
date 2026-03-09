// src/components/EditRecordDialog.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, ListItemButton, ListItemIcon, ListItemText,
  Chip, Divider, IconButton, Tabs, Tab, useTheme,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';

// ==========================================
// 型定義
// ==========================================
interface Material {
  id: string;
  categoryName: string;
  name: string;
  image: string;
  colorCode: string;
  sortOrder: number;
  unit: string;
}

interface PagesData {
  mode: 'total' | 'range';
  total: string;
  rangeStart: string;
  rangeEnd: string;
}

export interface EditableEntry {
  id: string;
  materialId: string | null;
  studyDatetime: string;
  durationMinutes: number | null;
  pages: number | null;
  memo: string | null;
  imageUrl: string | null;
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
  const mo = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}年${mo}月${dd}日 ${hh}:${mm}`;
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function extractDate(dt: string): string { return dt.slice(0, 10); }
function extractTime(dt: string): string { return dt.slice(11, 16); }
function combineDatetime(date: string, time: string): string { return `${date}T${time}`; }

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

// ==========================================
// CompactCell
// ==========================================
function CompactCell({
  icon, value, placeholder, onClick, highlight = false,
}: {
  icon: React.ReactNode;
  value?: string;
  placeholder: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center',
        borderRadius: '12px',
        border: highlight ? '2px solid' : '1px solid',
        borderColor: highlight ? 'primary.main' : 'divider',
        backgroundColor: highlight ? 'primary.lighter' : 'background.subtle',
        mb: 1.5, px: 2, height: '48px',
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
        color: value ? (highlight ? 'primary.main' : 'text.primary') : 'text.disabled',
      }}>
        {value || placeholder}
      </Typography>
      <KeyboardArrowRightIcon sx={{ color: highlight ? 'primary.main' : 'text.disabled', fontSize: '20px', flexShrink: 0 }} />
    </Box>
  );
}

// ==========================================
// 日付・時刻ダイアログ
// ==========================================
function DateDialog({ open, onClose, value, onChange }: {
  open: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const [localDate, setLocalDate] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    if (open) { setLocalDate(extractDate(value)); setLocalTime(extractTime(value)); }
  }, [open, value]);

  const quickDates = [{ label: '今日', value: daysAgo(0) }, { label: '昨日', value: daysAgo(1) }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>日付・時刻を選択</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, mt: 1 }}>
          {quickDates.map(qd => (
            <Button key={qd.value} size="small"
              variant={localDate === qd.value ? 'contained' : 'outlined'} disableElevation
              onClick={() => setLocalDate(qd.value)}
              sx={{
                flex: 1, borderRadius: '10px', fontWeight: 'bold', fontSize: '13px', py: 0.8,
                ...(localDate !== qd.value ? { borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', backgroundColor: 'primary.lighter' } } : {}),
              }}
            >{qd.label}</Button>
          ))}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>日付</Typography>
        <TextField type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} fullWidth size="small"
          slotProps={{ htmlInput: { style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
          sx={{ mb: 0.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
        />
        {localDate && (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mb: 2, pl: 0.5 }}>
            {formatDateLabel(localDate)}
          </Typography>
        )}
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>時刻</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField type="time" value={localTime} onChange={e => setLocalTime(e.target.value)} fullWidth size="small"
            slotProps={{ htmlInput: { step: 60, style: { fontSize: '16px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Button size="small" variant="outlined"
            onClick={() => { const now = nowDatetimeLocal(); setLocalDate(extractDate(now)); setLocalTime(extractTime(now)); }}
            sx={{ borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', py: 0.8, px: 1.5, minWidth: 0, whiteSpace: 'nowrap', color: 'text.primary', borderColor: 'divider' }}
          >現在</Button>
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
        <Button onClick={() => { onChange(combineDatetime(localDate, localTime)); onClose(); }}
          variant="contained" disableElevation sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>決定</Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 学習時間ダイアログ
// ==========================================
function DurationDialog({ open, onClose, hours, minutes, onConfirm }: {
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
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習時間を入力</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <TextField type="number" value={localH} onChange={e => setLocalH(e.target.value)}
            size="small" label="時間"
            slotProps={{ htmlInput: { min: 0, max: 24, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
          <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', flexShrink: 0 }}>:</Typography>
          <TextField type="number" value={localM} onChange={e => setLocalM(e.target.value)}
            size="small" label="分"
            slotProps={{ htmlInput: { min: 0, max: 59, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
          />
        </Box>
        {total > 0 && (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'primary.lighter', borderRadius: '10px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 'bold', color: 'primary.main' }}>合計 {formatDuration(total)}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={() => { onConfirm(localH, localM); onClose(); }} variant="contained" disableElevation
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>決定</Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 学習量ダイアログ
// ==========================================
function PagesDialog({ open, onClose, value, unit, onConfirm }: {
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
      setLocalTotal(value.total); setLocalStart(value.rangeStart); setLocalEnd(value.rangeEnd);
    }
  }, [open, value]);

  const rangeValid = localStart !== '' && localEnd !== '' && parseInt(localEnd) >= parseInt(localStart);
  const rangeHasInput = localStart !== '' || localEnd !== '';
  const rangeAmount = rangeValid ? parseInt(localEnd) - parseInt(localStart) : 0;
  const canConfirm = tabIndex === 0 ? true : (!rangeHasInput || rangeValid);

  const handleConfirm = () => {
    if (tabIndex === 0) {
      onConfirm({ mode: 'total', total: localTotal, rangeStart: '', rangeEnd: '' });
    } else {
      if (rangeHasInput && !rangeValid) return;
      onConfirm({ mode: 'range', total: rangeValid ? String(rangeAmount) : '', rangeStart: localStart, rangeEnd: localEnd });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', p: 1, m: { xs: 2, sm: 'auto' }, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', pb: 1, color: 'text.primary' }}>学習量を入力</DialogTitle>
      <DialogContent>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} variant="fullWidth"
          sx={{ mb: 2, minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, color: 'text.secondary' } }}
        >
          <Tab label="合計" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
          <Tab label="範囲" sx={{ fontWeight: 'bold', fontSize: '13px' }} />
        </Tabs>
        {tabIndex === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <TextField type="number" value={localTotal} onChange={e => setLocalTotal(e.target.value)} size="small" fullWidth
              slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
            />
            <Typography sx={{ fontWeight: 'bold', color: 'text.secondary', flexShrink: 0 }}>{unit}</Typography>
          </Box>
        )}
        {tabIndex === 1 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>開始</Typography>
                <TextField type="number" value={localStart} onChange={e => setLocalStart(e.target.value)} size="small" fullWidth placeholder="例: 1"
                  slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle' } }}
                />
              </Box>
              <Typography sx={{ fontWeight: 'bold', color: 'text.disabled', fontSize: '20px', mt: 2.5, flexShrink: 0 }}>〜</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 0.5, display: 'block' }}>終了</Typography>
                <TextField type="number" value={localEnd} onChange={e => setLocalEnd(e.target.value)} size="small" fullWidth placeholder="例: 10"
                  slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: theme.palette.text.primary } } }}
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
        <Button onClick={handleConfirm} variant="contained" disableElevation disabled={!canConfirm}
          sx={{ borderRadius: '8px', fontWeight: 'bold', px: 3 }}>決定</Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// 教材選択ダイアログ
// ==========================================
function MaterialSelectDialog({ open, onClose, materials, currentMaterial, onSelect }: {
  open: boolean;
  onClose: () => void;
  materials: Material[];
  currentMaterial: Material | null | 'none';
  onSelect: (m: Material | 'none') => void;
}) {
  const grouped = materials.reduce<Record<string, Material[]>>((acc, m) => {
    if (!acc[m.categoryName]) acc[m.categoryName] = [];
    acc[m.categoryName].push(m);
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', m: { xs: 1, sm: 'auto' }, maxHeight: '80vh', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        教材を選択
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2 }}>
        <Box
          onClick={() => { onSelect('none'); onClose(); }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 1,
            borderRadius: '12px', border: currentMaterial === 'none' ? '2px solid' : '1px solid',
            borderColor: currentMaterial === 'none' ? 'primary.main' : 'divider',
            backgroundColor: currentMaterial === 'none' ? 'primary.lighter' : 'background.subtle',
            cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' },
          }}
        >
          <MenuBookOutlinedIcon sx={{ color: currentMaterial === 'none' ? 'primary.main' : 'text.disabled' }} />
          <Typography sx={{ fontWeight: 'bold', color: currentMaterial === 'none' ? 'primary.main' : 'text.primary' }}>教材なし</Typography>
        </Box>
        {Object.entries(grouped).map(([cat, items]) => (
          <Box key={cat} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', px: 1, display: 'block', mb: 1 }}>{cat}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(auto-fill, minmax(140px, 1fr))' }, gap: { xs: 1, sm: 2 } }}>
              {items.map(item => {
                const isSelected = currentMaterial !== 'none' && (currentMaterial as Material)?.id === item.id;
                return (
                  <Box key={item.id}
                    onClick={() => { onSelect(item); onClose(); }}
                    sx={{
                      borderRadius: '12px', border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      backgroundColor: isSelected ? 'primary.lighter' : 'background.paper',
                      p: 1.5, cursor: 'pointer', textAlign: 'center',
                      '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
                    }}
                  >
                    <img src={item.image} alt="" style={{ height: '60px', objectFit: 'contain', marginBottom: '8px' }} />
                    <Typography sx={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? 'primary.main' : 'text.primary', lineHeight: 1.3 }}>
                      {item.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// EditRecordDialog（メイン）
// ==========================================
export default function EditRecordDialog({ open, onClose, entry, onSaved }: {
  open: boolean;
  onClose: () => void;
  entry: EditableEntry;
  onSaved: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null | 'none'>(null);
  const [recordDatetime, setRecordDatetime] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [pagesData, setPagesData] = useState<PagesData>({ mode: 'total', total: '', rangeStart: '', rangeEnd: '' });
  const [memo, setMemo] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [isDurationDialogOpen, setIsDurationDialogOpen] = useState(false);
  const [isPagesDialogOpen, setIsPagesDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォームの初期値をセット
  useEffect(() => {
    if (!open) return;
    const dt = new Date(entry.studyDatetime);
    const offset = dt.getTimezoneOffset();
    setRecordDatetime(new Date(dt.getTime() - offset * 60 * 1000).toISOString().slice(0, 16));

    const totalMins = entry.durationMinutes ?? 0;
    setHours(totalMins > 0 ? String(Math.floor(totalMins / 60)) : '');
    setMinutes(totalMins > 0 ? String(totalMins % 60) : '');
    setPagesData({ mode: 'total', total: entry.pages ? String(entry.pages) : '', rangeStart: '', rangeEnd: '' });
    setMemo(entry.memo ?? '');
    setImage(null);
    setPreviewUrl(null);
    setExistingImageUrl(entry.imageUrl);
  }, [open, entry]);

  // 教材フェッチ（ダイアログが開くたびに）
  useEffect(() => {
    if (!open) return;
    const fetchMaterials = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('materials')
        .select('id, title, image_url, unit, categories ( name, color_code, sort_order )')
        .eq('status', 'active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        const mapped: Material[] = data.map((item: any) => ({
          id: item.id,
          categoryName: item.categories?.name || 'カテゴリなし',
          name: item.title,
          image: item.image_url,
          colorCode: item.categories?.color_code || '#ccc',
          sortOrder: item.categories?.sort_order || 0,
          unit: item.unit || 'ページ',
        }));
        setMaterials(mapped);
        if (entry.materialId) {
          setSelectedMaterial(mapped.find(m => m.id === entry.materialId) ?? null);
        } else {
          setSelectedMaterial('none');
        }
      }
    };
    fetchMaterials();
  }, [open, entry.materialId]);

  const currentUnit = selectedMaterial && selectedMaterial !== 'none'
    ? (selectedMaterial as Material).unit : 'ページ';
  const hasMaterial = selectedMaterial !== null && selectedMaterial !== 'none';
  const totalMinutes = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');

  const pagesDisplayValue = (() => {
    if (pagesData.mode === 'range' && pagesData.rangeStart && pagesData.rangeEnd) {
      const amount = parseInt(pagesData.rangeEnd) - parseInt(pagesData.rangeStart);
      if (amount >= 0) return `${pagesData.rangeStart} 〜 ${pagesData.rangeEnd}（${amount} ${currentUnit}）`;
    }
    if (pagesData.total && parseInt(pagesData.total) > 0) return `${pagesData.total} ${currentUnit}`;
    return undefined;
  })();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let imageUrl = existingImageUrl;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('study-logs').upload(`public/${fileName}`, image);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('study-logs').getPublicUrl(`public/${fileName}`);
        imageUrl = urlData.publicUrl;
      }

      const materialId = selectedMaterial === null ? entry.materialId
        : selectedMaterial === 'none' ? null
        : (selectedMaterial as Material).id;

      const { error } = await supabase.from('study_logs').update({
        material_id: materialId,
        study_datetime: new Date(recordDatetime).toISOString(),
        duration_minutes: totalMinutes > 0 ? totalMinutes : null,
        pages: pagesData.total ? (parseInt(pagesData.total) || null) : null,
        memo: memo.trim() || null,
        image_url: imageUrl,
      }).eq('id', entry.id);
      if (error) throw error;

      onSaved();
      onClose();
    } catch (e) {
      console.error('更新エラー:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const materialLabel = () => {
    if (selectedMaterial === 'none') return '教材なし';
    if (selectedMaterial) return (selectedMaterial as Material).name;
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '20px', m: { xs: 1, sm: 'auto' }, maxHeight: '95vh', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        記録の編集
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', pt: 1 }}>

          {/* 教材 */}
          <ListItemButton onClick={() => setIsMaterialDialogOpen(true)} sx={{
            borderRadius: '16px',
            border: selectedMaterial ? '2px solid' : '1px solid',
            borderColor: selectedMaterial ? 'primary.main' : 'divider',
            backgroundColor: selectedMaterial ? 'primary.lighter' : 'background.subtle',
            mb: 1.5, px: 2, py: 2, minHeight: '100px', transition: '0.15s',
            '&:hover': { backgroundColor: 'action.hover', borderColor: 'primary.main' },
          }}>
            <ListItemIcon sx={{ minWidth: 60, mr: 2, color: selectedMaterial ? 'primary.main' : 'text.disabled', justifyContent: 'center' }}>
              {selectedMaterial && selectedMaterial !== 'none' ? (
                <img src={(selectedMaterial as Material).image} alt="" style={{ height: '60px', maxWidth: '60px', objectFit: 'contain' }} />
              ) : (
                <MenuBookOutlinedIcon sx={{ fontSize: '36px' }} />
              )}
            </ListItemIcon>
            <ListItemText primary={
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {selectedMaterial && selectedMaterial !== 'none' && (
                  <Chip label={(selectedMaterial as Material).categoryName} size="small" sx={{
                    backgroundColor: (selectedMaterial as Material).colorCode, color: '#fff',
                    fontSize: '11px', height: '22px', fontWeight: 'bold', alignSelf: 'flex-start',
                  }} />
                )}
                <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: selectedMaterial ? 'primary.main' : 'text.disabled', lineHeight: 1.3 }}>
                  {materialLabel() ?? '教材を選択'}
                </Typography>
              </Box>
            } />
            <KeyboardArrowRightIcon sx={{ color: selectedMaterial ? 'primary.main' : 'text.disabled', fontSize: '24px' }} />
          </ListItemButton>

          {/* 日付 */}
          <CompactCell
            icon={<CalendarTodayOutlinedIcon fontSize="small" />}
            value={formatDatetime(recordDatetime)}
            placeholder="日付・時刻を選択"
            onClick={() => setIsDateDialogOpen(true)}
          />

          {/* 学習時間 */}
          <CompactCell
            icon={<AccessTimeIcon fontSize="small" />}
            value={totalMinutes > 0 ? formatDuration(totalMinutes) : undefined}
            placeholder="学習時間を入力"
            onClick={() => setIsDurationDialogOpen(true)}
            highlight={totalMinutes > 0}
          />

          {/* 学習量 */}
          {hasMaterial && (
            <CompactCell
              icon={<MenuBookRoundedIcon fontSize="small" />}
              value={pagesDisplayValue}
              placeholder={`学習量を入力（${currentUnit}）`}
              onClick={() => setIsPagesDialogOpen(true)}
              highlight={!!pagesDisplayValue}
            />
          )}

          <Divider sx={{ my: 1 }} />

          {/* メモ */}
          <Box sx={{ mt: 1, mb: 1.5 }}>
            <TextField
              placeholder="要点・ひとことメモ" value={memo}
              onChange={e => setMemo(e.target.value)}
              fullWidth multiline rows={3} disabled={isSaving}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: 'background.subtle', color: 'text.primary' } }}
            />
          </Box>

          {/* 画像 */}
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageChange} />
          {image && previewUrl ? (
            <Box onClick={() => fileInputRef.current?.click()} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              borderRadius: '12px', border: '2px solid', borderColor: 'primary.main',
              backgroundColor: 'primary.lighter', mb: 1.5, px: 2, py: 1.5,
              cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' },
            }}>
              <img src={previewUrl} alt="preview" style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px' }} />
              <Typography sx={{ fontWeight: 'bold', fontSize: '13px', color: 'primary.main', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {image.name}
              </Typography>
              <KeyboardArrowRightIcon sx={{ color: 'primary.main', fontSize: '20px' }} />
            </Box>
          ) : existingImageUrl ? (
            <Box onClick={() => fileInputRef.current?.click()} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              borderRadius: '12px', border: '1px solid', borderColor: 'divider',
              backgroundColor: 'background.subtle', mb: 1.5, px: 2, py: 1.5,
              cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover', borderColor: 'primary.main' },
            }}>
              <img src={existingImageUrl} alt="existing" style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px' }} />
              <Typography sx={{ fontWeight: 'bold', fontSize: '13px', color: 'text.primary', flexGrow: 1 }}>
                添付画像（変更する場合はタップ）
              </Typography>
              <KeyboardArrowRightIcon sx={{ color: 'text.disabled', fontSize: '20px' }} />
            </Box>
          ) : (
            <CompactCell
              icon={<ImageOutlinedIcon fontSize="small" />}
              placeholder="画像を添付"
              onClick={() => fileInputRef.current?.click()}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" disableElevation
          disabled={isSaving || selectedMaterial === null}
          sx={{ borderRadius: '10px', fontWeight: 'bold', px: 3 }}
        >
          {isSaving ? <CircularProgress size={20} color="inherit" /> : '変更'}
        </Button>
      </DialogActions>

      <MaterialSelectDialog
        open={isMaterialDialogOpen}
        onClose={() => setIsMaterialDialogOpen(false)}
        materials={materials}
        currentMaterial={selectedMaterial}
        onSelect={setSelectedMaterial}
      />
      <DateDialog open={isDateDialogOpen} onClose={() => setIsDateDialogOpen(false)} value={recordDatetime} onChange={setRecordDatetime} />
      <DurationDialog open={isDurationDialogOpen} onClose={() => setIsDurationDialogOpen(false)} hours={hours} minutes={minutes} onConfirm={(h, m) => { setHours(h); setMinutes(m); }} />
      {hasMaterial && (
        <PagesDialog open={isPagesDialogOpen} onClose={() => setIsPagesDialogOpen(false)} value={pagesData} unit={currentUnit} onConfirm={setPagesData} />
      )}
    </Dialog>
  );
}
