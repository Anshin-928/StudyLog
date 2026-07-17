// src/components/Record.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Chip, Tabs, Tab,
  IconButton, Divider, ListItemButton, ListItemText, ListItemIcon,
  Snackbar, Alert, Fade, useMediaQuery, useTheme
} from '@mui/material';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useBlocker, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validateImageFile } from '../lib/imageValidation';
import { formatDuration, formatDatetime, nowDatetimeLocal } from '../lib/datetimeUtils';
import { fetchActiveMaterials } from '../lib/materialsApi';
import { uploadStudyLogImage } from '../lib/studyLogImages';
import type { Material, PagesData } from '../types/record';
import NavigationBlockerDialog from './NavigationBlockerDialog';
import CompactCell from './record/CompactCell';
import DateDialog from './record/DateDialog';
import DurationDialog from './record/DurationDialog';
import PagesDialog, { getPagesDisplayValue } from './record/PagesDialog';
import MaterialSelectDialog from './record/MaterialSelectDialog';


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
  const [imageError, setImageError] = useState<string | null>(null);

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

  const pagesDisplayValue = getPagesDisplayValue(pagesData, currentUnit);

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
      {imageError && (
        <Typography variant="caption" sx={{ color: 'error.main', mb: 1, display: 'block' }}>
          {imageError}
        </Typography>
      )}
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
      setMaterials(await fetchActiveMaterials(theme.palette.divider));
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
        const validationError = validateImageFile(image);
        if (validationError) {
          showSnackbar(validationError, 'error');
          return;
        }
        imageUrl = await uploadStudyLogImage(image);
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