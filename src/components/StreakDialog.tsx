// src/components/StreakDialog.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent,
  Box, Typography, IconButton, CircularProgress, useTheme,
  TextField, alpha, Collapse, Popover
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { supabase } from '../lib/supabase';

interface StreakDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ExamEvent {
  id: string;
  name: string;
  event_date: string;
}

// ==========================================
// ユーティリティ
// ==========================================
function toLocalDateStr(isoStr: string): string {
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function todayStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function calcStreak(studyDates: Set<string>): number {
  let streak = 0;
  const today = todayStr();
  const cursor = new Date();

  if (!studyDates.has(today)) cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const offset = cursor.getTimezoneOffset();
    const key = new Date(cursor.getTime() - offset * 60000).toISOString().slice(0, 10);
    if (!studyDates.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  return cells;
}

function makeDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysUntil(dateStr: string): number {
  const today = new Date(todayStr());
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ==========================================
// カスタム日付ピッカー
// ==========================================
function DatePickerButton({ value, onChange, minDate }: {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}) {
  const theme = useTheme();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [pickerYear, setPickerYear] = useState(initialDate.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(initialDate.getMonth() + 1);

  const cells = useMemo(() => getCalendarCells(pickerYear, pickerMonth), [pickerYear, pickerMonth]);
  const today = todayStr();
  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  const handleOpen = () => {
    const base = value ? new Date(value + 'T00:00:00') : new Date();
    setPickerYear(base.getFullYear());
    setPickerMonth(base.getMonth() + 1);
    setOpen(true);
  };

  const handleSelectDay = (day: number) => {
    const key = makeDateKey(pickerYear, pickerMonth, day);
    if (minDate && key < minDate) return;
    onChange(key);
    setOpen(false);
  };

  const handlePrev = () => {
    if (pickerMonth === 1) { setPickerYear(y => y - 1); setPickerMonth(12); }
    else setPickerMonth(m => m - 1);
  };
  const handleNext = () => {
    if (pickerMonth === 12) { setPickerYear(y => y + 1); setPickerMonth(1); }
    else setPickerMonth(m => m + 1);
  };

  const displayLabel = value
    ? (() => {
        const d = new Date(value + 'T00:00:00');
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      })()
    : '日付を選択';

  return (
    <>
      <Box
        component="button"
        ref={anchorRef}
        onClick={handleOpen}
        sx={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, height: '40px', borderRadius: '10px',
          border: '1px solid', borderColor: 'divider',
          backgroundColor: 'background.paper',
          cursor: 'pointer', textAlign: 'left',
          '&:hover': { borderColor: 'text.primary' },
          transition: 'border-color 0.15s',
        }}
      >
        <CalendarTodayRoundedIcon sx={{ fontSize: '15px', color: value ? 'text.secondary' : 'text.disabled', flexShrink: 0 }} />
        <Typography sx={{
          fontSize: '14px',
          color: value ? 'text.primary' : 'text.disabled',
          fontWeight: value ? 500 : 400,
        }}>
          {displayLabel}
        </Typography>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.5, p: 2, borderRadius: '16px',
            boxShadow: theme.customShadows.lg,
            backgroundImage: 'none',
            minWidth: '272px',
          },
        }}
      >
        {/* 月ナビ */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <IconButton size="small" onClick={handlePrev} sx={{ color: 'text.primary' }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ fontWeight: 'bold', fontSize: '15px', color: 'text.primary' }}>
            {pickerYear}年{pickerMonth}月
          </Typography>
          <IconButton size="small" onClick={handleNext} sx={{ color: 'text.primary' }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 曜日 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
          {DAY_LABELS.map((d, i) => (
            <Typography key={d} sx={{
              textAlign: 'center', fontWeight: 'bold', fontSize: '11px',
              color: i === 0 ? 'error.main' : i === 6 ? 'primary.main' : 'text.disabled',
            }}>
              {d}
            </Typography>
          ))}
        </Box>

        {/* 日付グリッド */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((day, i) => {
            if (day === null) return <Box key={`e-${i}`} />;
            const dateKey = makeDateKey(pickerYear, pickerMonth, day);
            const isSelected = dateKey === value;
            const isToday = dateKey === today;
            const isPast = minDate ? dateKey < minDate : false;
            const dow = new Date(pickerYear, pickerMonth - 1, day).getDay();

            return (
              <Box
                key={day}
                onClick={() => !isPast && handleSelectDay(day)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  aspectRatio: '1', borderRadius: '50%',
                  backgroundColor: isSelected ? 'primary.main' : 'transparent',
                  border: isToday && !isSelected ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  cursor: isPast ? 'default' : 'pointer',
                  opacity: isPast ? 0.3 : 1,
                  '&:hover': !isPast ? {
                    backgroundColor: isSelected ? 'primary.dark' : 'action.hover',
                  } : {},
                  transition: 'background-color 0.15s',
                }}
              >
                <Typography sx={{
                  fontSize: '13px',
                  fontWeight: isSelected || isToday ? 'bold' : 'normal',
                  color: isSelected
                    ? '#fff'
                    : isToday
                    ? 'primary.main'
                    : dow === 0 ? 'error.main'
                    : dow === 6 ? 'primary.main'
                    : 'text.primary',
                }}>
                  {day}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

// ==========================================
// メイン
// ==========================================
export default function StreakDialog({ open, onClose }: StreakDialogProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [studyDates, setStudyDates] = useState<Set<string>>(new Set());
  const [examEvents, setExamEvents] = useState<ExamEvent[]>([]);

  // カレンダー試験日ポップオーバー
  const [examPopoverAnchor, setExamPopoverAnchor] = useState<HTMLElement | null>(null);
  const [examPopoverDate, setExamPopoverDate] = useState('');

  // イベント追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [logsRes, eventsRes] = await Promise.all([
        supabase.from('study_logs').select('study_datetime').eq('user_id', user.id),
        supabase.from('exam_events').select('id, name, event_date').eq('user_id', user.id).order('event_date', { ascending: true }),
      ]);

      if (logsRes.data) {
        setStudyDates(new Set(logsRes.data.map((r: any) => toLocalDateStr(r.study_datetime))));
      }
      if (eventsRes.data) {
        setExamEvents(eventsRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open, fetchData]);

  // フォームリセット
  useEffect(() => {
    if (!open) {
      setShowAddForm(false);
      setNewEventName('');
      setNewEventDate('');
    }
  }, [open]);

  const handleAddEvent = async () => {
    if (!newEventName.trim() || !newEventDate) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('exam_events').insert({
        user_id: user.id,
        name: newEventName.trim(),
        event_date: newEventDate,
      }).select('id, name, event_date').single();

      if (error) throw error;
      if (data) {
        setExamEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      }
      setNewEventName('');
      setNewEventDate('');
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await supabase.from('exam_events').delete().eq('id', eventId);
      setExamEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (e) {
      console.error(e);
    }
  };

  const streak = useMemo(() => calcStreak(studyDates), [studyDates]);
  const today = todayStr();
  const isStudiedToday = studyDates.has(today);
  const cells = useMemo(() => getCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  // カレンダー上のイベント日セット
  const eventDateSet = useMemo(() => new Set(examEvents.map(e => e.event_date)), [examEvents]);

  // 日付→イベント名リストのマップ
  const examEventsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    examEvents.forEach(e => {
      const names = map.get(e.event_date) ?? [];
      map.set(e.event_date, [...names, e.name]);
    });
    return map;
  }, [examEvents]);

  // 未来のイベントのみ表示（今日以降）
  const upcomingEvents = useMemo(
    () => examEvents.filter(e => daysUntil(e.event_date) >= 0),
    [examEvents],
  );

  const monthStudyDays = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}-`;
    let count = 0;
    studyDates.forEach(d => { if (d.startsWith(prefix)) count++; });
    return count;
  }, [studyDates, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: '20px', sm: '24px' },
          overflow: 'hidden',
          boxShadow: theme.customShadows.lg,
          backgroundImage: 'none',
          m: { xs: 2, sm: 3 },
        },
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: { xs: 2.5, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 0,
      }}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '17px', color: 'text.primary' }}>学習記録</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 1.5, sm: 2 }, pb: { xs: 2.5, sm: 3 } }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* ストリーク表示エリア */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', py: { xs: 1.5, sm: 3 }, gap: 1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{
                  fontSize: { xs: '56px', sm: '64px' }, fontWeight: '900',
                  color: streak > 0 && isStudiedToday ? 'streak.main' : 'text.disabled',
                  lineHeight: 1, letterSpacing: '-2px',
                }}>
                  {streak}
                </Typography>
                <LocalFireDepartmentRoundedIcon sx={{
                  fontSize: { xs: '52px', sm: '56px' },
                  color: streak > 0 && isStudiedToday ? 'streak.main' : 'text.disabled',
                }} />
              </Box>
              <Typography sx={{ fontWeight: 'bold', color: 'text.secondary', fontSize: '15px' }}>
                {streak > 0 ? `${streak}日 連続達成！` : '今日から始めよう！'}
              </Typography>
            </Box>

            {/* 学習日数統計バー */}
            <Box sx={{
              display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: '14px',
              overflow: 'hidden', mb: { xs: 2.5, sm: 3 }, backgroundColor: 'background.subtle'
            }}>
              <Box sx={{
                flex: 1, py: 2, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 0.5, borderRight: '1px solid', borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckCircleRoundedIcon sx={{ color: 'primary.main', fontSize: '18px' }} />
                  <Typography sx={{ fontWeight: '900', fontSize: '26px', color: 'primary.main' }}>
                    {monthStudyDays}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                  今月の学習日数
                </Typography>
              </Box>
              <Box sx={{
                flex: 1, py: 2, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 0.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: '18px' }} />
                  <Typography sx={{ fontWeight: '900', fontSize: '26px', color: 'success.main' }}>
                    {studyDates.size}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
                  累計学習日数
                </Typography>
              </Box>
            </Box>

            {/* カレンダー操作ナビ */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton onClick={handlePrevMonth} size="small" sx={{ color: 'text.primary' }}>
                <ChevronLeftIcon />
              </IconButton>
              <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: 'text.primary' }}>
                {viewYear}年{viewMonth}月
              </Typography>
              <IconButton onClick={handleNextMonth} size="small" sx={{ color: 'text.primary' }}>
                <ChevronRightIcon />
              </IconButton>
            </Box>

            {/* カレンダー曜日見出し */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
              {DAY_LABELS.map((d, i) => (
                <Typography key={d} variant="caption" sx={{
                  textAlign: 'center', fontWeight: 'bold',
                  color: i === 0 ? 'error.main' : i === 6 ? 'primary.main' : 'text.disabled',
                  fontSize: '11px',
                }}>
                  {d}
                </Typography>
              ))}
            </Box>

            {/* カレンダー日付グリッド */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {cells.map((day, i) => {
                if (day === null) return <Box key={`empty-${i}`} />;
                const dateKey = makeDateKey(viewYear, viewMonth, day);
                const isStudied = studyDates.has(dateKey);
                const isToday = dateKey === today;
                const isExamDay = eventDateSet.has(dateKey);
                const cellDayOfWeek = (new Date(viewYear, viewMonth - 1, day).getDay());

                return (
                  <Box
                    key={day}
                    onClick={isExamDay ? (e: React.MouseEvent<HTMLElement>) => {
                      setExamPopoverAnchor(e.currentTarget);
                      setExamPopoverDate(dateKey);
                    } : undefined}
                    sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      aspectRatio: '1',
                      borderRadius: '50%',
                      backgroundColor: isStudied ? 'primary.main' : 'transparent',
                      border: isExamDay && !isStudied
                        ? '2px solid'
                        : isToday && !isStudied
                        ? '2px solid'
                        : 'none',
                      borderColor: isExamDay && !isStudied
                        ? 'streak.main'
                        : 'primary.main',
                      position: 'relative',
                      cursor: isExamDay ? 'pointer' : 'default',
                    }}>
                    <Typography sx={{
                      fontSize: { xs: '13px', sm: '14px' },
                      fontWeight: isStudied || isToday || isExamDay ? 'bold' : 'normal',
                      color: isStudied
                        ? 'error.contrastText'
                        : isExamDay
                        ? 'streak.main'
                        : isToday
                        ? 'primary.main'
                        : cellDayOfWeek === 0
                        ? 'error.main'
                        : cellDayOfWeek === 6
                        ? 'primary.main'
                        : 'text.primary',
                    }}>
                      {day}
                    </Typography>
                    {/* 試験日ドット（学習済みの場合も表示） */}
                    {isExamDay && (
                      <Box sx={{
                        position: 'absolute',
                        bottom: { xs: '2px', sm: '3px' },
                        width: '5px', height: '5px',
                        borderRadius: '50%',
                        backgroundColor: isStudied ? '#fff' : 'streak.main',
                      }} />
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* 試験日ポップオーバー */}
            <Popover
              open={Boolean(examPopoverAnchor)}
              anchorEl={examPopoverAnchor}
              onClose={() => setExamPopoverAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              PaperProps={{
                sx: {
                  mt: 0.75, px: 1.5, py: 1.25, borderRadius: '12px',
                  boxShadow: theme.customShadows.md,
                  backgroundImage: 'none',
                  border: '1px solid', borderColor: 'divider',
                  maxWidth: '200px',
                },
              }}
            >
              {(examEventsByDate.get(examPopoverDate) ?? []).map((name, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.25 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'streak.main', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.primary' }}>
                    {name}
                  </Typography>
                </Box>
              ))}
            </Popover>

            {/* 試験日カウントダウンセクション */}
            <Box sx={{ mt: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <EventRoundedIcon sx={{ fontSize: '18px', color: 'text.secondary' }} />
                  <Typography sx={{ fontWeight: 'bold', fontSize: '14px', color: 'text.secondary' }}>
                    試験日
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setShowAddForm(prev => !prev)}
                  sx={{
                    width: 28, height: 28,
                    backgroundColor: showAddForm ? 'action.selected' : 'transparent',
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  {showAddForm ? <CloseIcon sx={{ fontSize: '16px' }} /> : <AddRoundedIcon sx={{ fontSize: '18px' }} />}
                </IconButton>
              </Box>

              {/* 追加フォーム */}
              <Collapse in={showAddForm}>
                <Box sx={{
                  display: 'flex', flexDirection: 'column', gap: 1.5,
                  p: 2, mb: 1.5, borderRadius: '12px',
                  border: '1px solid', borderColor: 'divider',
                  backgroundColor: 'background.subtle',
                }}>
                  <TextField
                    size="small"
                    placeholder="試験名"
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    inputProps={{ maxLength: 30 }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '10px',
                        fontSize: '14px',
                        backgroundColor: 'background.paper',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <DatePickerButton
                      value={newEventDate}
                      onChange={setNewEventDate}
                      minDate={todayStr()}
                    />
                    <IconButton
                      onClick={handleAddEvent}
                      disabled={!newEventName.trim() || !newEventDate || isSaving}
                      sx={{
                        width: 36, height: 36,
                        backgroundColor: 'primary.main',
                        color: '#fff',
                        '&:hover': { backgroundColor: 'primary.dark' },
                        '&.Mui-disabled': { backgroundColor: 'action.disabledBackground', color: 'action.disabled' },
                      }}
                    >
                      {isSaving ? <CircularProgress size={16} color="inherit" /> : <CheckRoundedIcon sx={{ fontSize: '18px' }} />}
                    </IconButton>
                  </Box>
                </Box>
              </Collapse>

              {/* イベント一覧 */}
              {upcomingEvents.length === 0 && !showAddForm ? (
                <Typography sx={{ fontSize: '13px', color: 'text.disabled', textAlign: 'center', py: 2 }}>
                  試験日を登録すると{'\n'}カウントダウンが表示されます
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {upcomingEvents.map(event => {
                    const days = daysUntil(event.event_date);
                    const d = new Date(event.event_date + 'T00:00:00');
                    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

                    return (
                      <Box key={event.id} sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 2, py: 1.5, borderRadius: '12px',
                        border: '1px solid', borderColor: 'divider',
                        backgroundColor: days <= 7
                          ? alpha(theme.palette.error.main, 0.06)
                          : days <= 30
                          ? alpha(theme.palette.warning.main, 0.06)
                          : 'background.subtle',
                      }}>
                        {/* カウントダウン */}
                        <Box sx={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          minWidth: '52px',
                        }}>
                          <Typography sx={{
                            fontSize: '24px', fontWeight: '900', lineHeight: 1,
                            color: days <= 7 ? 'error.main' : days <= 30 ? 'warning.main' : 'streak.main',
                          }}>
                            {days}
                          </Typography>
                          <Typography sx={{
                            fontSize: '11px', fontWeight: 'bold',
                            color: days <= 7 ? 'error.main' : days <= 30 ? 'warning.main' : 'streak.main',
                          }}>
                            {days === 0 ? '今日！' : '日後'}
                          </Typography>
                        </Box>

                        {/* イベント名と日付 */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{
                            fontSize: '14px', fontWeight: 'bold', color: 'text.primary',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {event.name}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                            {dateLabel}
                          </Typography>
                        </Box>

                        {/* 削除ボタン */}
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteEvent(event.id)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: '18px' }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
