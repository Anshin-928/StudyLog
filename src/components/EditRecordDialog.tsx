// src/components/EditRecordDialog.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, ListItemButton, ListItemIcon, ListItemText,
  Chip, Divider, IconButton,
} from '@mui/material';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/Close';
import { supabase } from '../lib/supabase';
import { validateImageFile } from '../lib/imageValidation';
import { formatDuration, formatDatetime } from '../lib/datetimeUtils';
import { fetchActiveMaterials } from '../lib/materialsApi';
import { uploadStudyLogImage } from '../lib/studyLogImages';
import type { Material, PagesData } from '../types/record';
import CompactCell from './record/CompactCell';
import DateDialog from './record/DateDialog';
import DurationDialog from './record/DurationDialog';
import PagesDialog, { getPagesDisplayValue } from './record/PagesDialog';
import MaterialSelectDialog from './record/MaterialSelectDialog';

// ==========================================
// 型定義
// ==========================================

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
  const [imageError, setImageError] = useState<string | null>(null);
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
      try {
        const mapped = await fetchActiveMaterials();
        setMaterials(mapped);
        if (entry.materialId) {
          setSelectedMaterial(mapped.find(m => m.id === entry.materialId) ?? null);
        } else {
          setSelectedMaterial('none');
        }
      } catch (e) { console.error('教材取得エラー:', e); }
    };
    fetchMaterials();
  }, [open, entry.materialId]);

  const currentUnit = selectedMaterial && selectedMaterial !== 'none'
    ? (selectedMaterial as Material).unit : 'ページ';
  const hasMaterial = selectedMaterial !== null && selectedMaterial !== 'none';
  const totalMinutes = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');

  const pagesDisplayValue = getPagesDisplayValue(pagesData, currentUnit);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validationError = validateImageFile(file);
      setImageError(validationError);
      if (validationError) {
        e.target.value = '';
        return;
      }
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
        if (validateImageFile(image)) return;
        imageUrl = await uploadStudyLogImage(image);
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
          {imageError && (
            <Typography variant="caption" sx={{ color: 'error.main', mb: 1, display: 'block' }}>
              {imageError}
            </Typography>
          )}
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
