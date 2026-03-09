// src/components/StreakDialog.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent,
  Box, Typography, IconButton, CircularProgress, useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { supabase } from '../lib/supabase';

interface StreakDialogProps {
  open: boolean;
  onClose: () => void;
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

// ==========================================
// メイン
// ==========================================
export default function StreakDialog({ open, onClose }: StreakDialogProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [studyDates, setStudyDates] = useState<Set<string>>(new Set());

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    if (!open) return;
    const fetchDates = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('study_logs')
          .select('study_datetime')
          .eq('user_id', user.id); 

        if (data) {
          setStudyDates(new Set(data.map((r: any) => toLocalDateStr(r.study_datetime))));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDates();
  }, [open]);

  const streak = useMemo(() => calcStreak(studyDates), [studyDates]);
  const today = todayStr();
  const isStudiedToday = studyDates.has(today);
  const cells = useMemo(() => getCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (viewYear > currentYear || (viewYear === currentYear && viewMonth >= currentMonth)) return;
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const isNextDisabled = useMemo(() => {
    const cy = new Date().getFullYear();
    const cm = new Date().getMonth() + 1;
    return viewYear > cy || (viewYear === cy && viewMonth >= cm);
  }, [viewYear, viewMonth]);

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
              <IconButton onClick={handleNextMonth} size="small" disabled={isNextDisabled} sx={{ color: 'text.primary' }}>
                <ChevronRightIcon />
              </IconButton>
            </Box>

            {/* カレンダー曜日見出し */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
              {DAY_LABELS.map((d, i) => (
                <Typography key={d} variant="caption" sx={{
                  textAlign: 'center', fontWeight: 'bold',
                  // 日曜は error.main（赤）、土曜は primary.main（青）
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
                const cellDayOfWeek = (new Date(viewYear, viewMonth - 1, day).getDay());

                return (
                  <Box key={day} sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    backgroundColor: isStudied ? 'primary.main' : 'transparent',
                    border: isToday && !isStudied ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                    position: 'relative',
                  }}>
                    <Typography sx={{
                      fontSize: { xs: '13px', sm: '14px' },
                      fontWeight: isStudied || isToday ? 'bold' : 'normal',
                      color: isStudied
                        ? 'error.contrastText' // 学習済みは白文字
                        : isToday
                        ? 'primary.main'
                        : cellDayOfWeek === 0
                        ? 'error.main' // 日曜
                        : cellDayOfWeek === 6
                        ? 'primary.main' // 土曜
                        : 'text.primary',
                    }}>
                      {day}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}