// src/components/Report.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Card, CardContent,
  ToggleButtonGroup, ToggleButton, Avatar, LinearProgress, Chip,
  useMediaQuery, useTheme, alpha
} from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import DateRangeRoundedIcon from '@mui/icons-material/DateRangeRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';

// ==========================================
// 型定義
// ==========================================
type Period = '7d' | '30d' | '1y';

interface LogEntry {
  id: string;
  materialId: string | null;
  materialName: string | null;
  materialImage: string | null;
  colorCode: string | null;
  studyDatetime: string;
  durationMinutes: number | null;
}

interface PieItem {
  key: string;
  name: string;
  value: number;
  image: string | null;
  color: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '直近7日間',
  '30d': '直近30日間',
  '1y': '直近1年間',
};

// ==========================================
// ユーティリティ
// ==========================================
function formatDuration(mins: number): string {
  if (mins <= 0) return '0分';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}分`;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function formatDurationHoursOnly(mins: number): string {
  const h = Math.floor(mins / 60);
  return `${h}時間`;
}

function formatDurationShort(mins: number): string {
  if (mins <= 0) return '0';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function todayStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function toLocalDate(isoStr: string): string {
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

function shortMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getPeriodStart(period: Period): string {
  if (period === '7d') return daysAgoStr(6);
  if (period === '30d') return daysAgoStr(29);
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// ==========================================
// データ加工
// ==========================================

function buildPieData(logs: LogEntry[], chartColors: string[]): PieItem[] {
  const materialMap = new Map<string, { name: string; value: number; image: string | null }>();

  for (const l of logs) {
    if ((l.durationMinutes ?? 0) <= 0) continue;
    const key = l.materialId ?? '__none__';
    const name = l.materialName ?? '教材なし';
    if (!materialMap.has(key)) {
      materialMap.set(key, { name, value: 0, image: l.materialImage });
    }
    materialMap.get(key)!.value += l.durationMinutes ?? 0;
  }

  return Array.from(materialMap.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({
      ...item,
      color: chartColors[i % chartColors.length],
    }));
}

type StackedBarItem = Record<string, string | number>;

function buildStackedBarData(logs: LogEntry[], period: Period): StackedBarItem[] {
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const result: StackedBarItem[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dateStr = daysAgoStr(i);
      const dayLogs = logs.filter(l => toLocalDate(l.studyDatetime) === dateStr);

      const item: StackedBarItem = {
        label: shortDate(dateStr),
        fullLabel: shortDate(dateStr),
      };

      for (const l of dayLogs) {
        if ((l.durationMinutes ?? 0) <= 0) continue;
        const key = l.materialId ?? '__none__';
        item[key] = ((item[key] as number) || 0) + (l.durationMinutes ?? 0);
      }

      result.push(item);
    }
    return result;
  }

  const result: StackedBarItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLogs = logs.filter(l => toLocalDate(l.studyDatetime).slice(0, 7) === ym);

    const item: StackedBarItem = {
      label: `${parseInt(ym.split('-')[1])}月`,
      fullLabel: shortMonth(ym),
    };

    for (const l of monthLogs) {
      if ((l.durationMinutes ?? 0) <= 0) continue;
      const key = l.materialId ?? '__none__';
      item[key] = ((item[key] as number) || 0) + (l.durationMinutes ?? 0);
    }

    result.push(item);
  }
  return result;
}

// ==========================================
// カスタム Tooltip（積み上げ棒グラフ）
// ==========================================
const CustomStackedBarTooltip = ({ active, payload }: any) => {
  const theme = useTheme();
  if (!active || !payload || payload.length === 0) return null;

  const fullLabel = payload[0]?.payload?.fullLabel ?? payload[0]?.payload?.label;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  if (total === 0) return null;

  const segments = [...payload].reverse().filter((p: any) => p.value > 0);

  return (
    <Box sx={{
      backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider',
      borderRadius: '12px', px: 2, py: 1.5,
      boxShadow: theme.customShadows.md,
      minWidth: '180px', zIndex: 10,
    }}>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1, fontWeight: 'bold' }}>
        {fullLabel}
      </Typography>
      {segments.map((p: any) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.fill, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
            {p.name}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.primary', flexShrink: 0 }}>
            {formatDuration(p.value)}
          </Typography>
        </Box>
      ))}
      {segments.length > 1 && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.75, pt: 0.75, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>合計</Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatDuration(total)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ==========================================
// カスタム Tooltip（円グラフ）
// ==========================================
const CustomPieTooltip = ({ active, payload }: any) => {
  const theme = useTheme();
  if (!active || !payload || payload.length === 0) return null;
  const { name, value, color } = payload[0].payload;
  const total = payload[0].payload.__total ?? value;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{
      backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider',
      borderRadius: '12px', px: 2, py: 1.5,
      boxShadow: theme.customShadows.md,
      maxWidth: '200px', zIndex: 10,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>{name}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '15px' }}>
        {formatDuration(value)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
        {pct}%
      </Typography>
    </Box>
  );
};

// ==========================================
// サマリーカード
// ==========================================
function SummaryCard({ icon, label, value, colorKey = 'primary' }: { icon: React.ReactNode; label: string; value: string; colorKey?: string; }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // パレットから動的に色を取得（streak.main, primary.main など）
  const mainColor = (theme.palette as any)[colorKey]?.main || theme.palette.primary.main;

  return (
    <Card sx={{
      flex: 1, minWidth: 0,
      borderRadius: '16px', border: '1px solid', borderColor: 'divider',
      boxShadow: theme.customShadows.sm,
      transition: '0.2s',
      backgroundColor: 'background.paper',
      '&:hover': { boxShadow: theme.customShadows.md, transform: 'translateY(-2px)' },
    }}>
      <CardContent sx={{ p: isMobile ? 0.9 : 2.5, '&:last-child': { pb: isMobile ? 1.5 : 2.5 } }}>
        <Box sx={{
          width: isMobile ? 28 : 38, height: isMobile ? 28 : 38,
          borderRadius: '11px',
          backgroundColor: alpha(mainColor, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: mainColor, mb: 1.5,
          '& svg': { fontSize: isMobile ? '18px' : '24px' }
        }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 'bold', display: 'block', mb: 0.5,
          fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
         }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 'bold', fontSize: isMobile ? '18px' : '22px', color: 'text.primary', lineHeight: 1.2 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ==========================================
// 教材別ランキング
// ==========================================
function MaterialRanking({ pieData, total }: { pieData: PieItem[]; total: number; }) {
  if (pieData.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: 'text.disabled' }}>
        <MenuBookOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography variant="body2">この期間の記録はありません</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {pieData.map((item, i) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <Box key={item.key}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
              <Typography sx={{
                width: 20, textAlign: 'center', fontWeight: 'bold',
                fontSize: '13px', color: i < 3 ? item.color : 'text.disabled', flexShrink: 0,
              }}>
                {i + 1}
              </Typography>
              
              {item.image ? (
                <Box component="img" src={item.image} sx={{ width: 32, height: 44, flexShrink: 0, objectFit: 'cover', borderRadius: '4px', boxShadow: 'action.hover' }} />
              ) : (
                <Box sx={{ width: 32, height: 44, flexShrink: 0, borderRadius: '4px', backgroundColor: alpha(item.color, 0.12), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MenuBookOutlinedIcon sx={{ fontSize: '18px' }} />
                </Box>
              )}

              <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.primary', flexGrow: 1, minWidth: 0, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, lineHeight: 1.3 }}>
                {item.name}
              </Typography>

              <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {formatDuration(item.value)}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: item.color, fontWeight: 'bold', flexShrink: 0, minWidth: '36px', textAlign: 'right' }}>
                {pct}%
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, ml: '36px', backgroundColor: alpha(item.color, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 3 } }} />
          </Box>
        );
      })}
    </Box>
  );
}

// ==========================================
// 円グラフ凡例
// ==========================================
function PieLegend({ pieData, total }: { pieData: PieItem[]; total: number }) {
  if (pieData.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
      {pieData.map(item => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.primary', flexGrow: 1, minWidth: 0, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, lineHeight: 1.3 }}>
              {item.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatDuration(item.value)}
            </Typography>
            <Chip label={`${pct}%`} size="small" sx={{ height: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: alpha(item.color, 0.12), color: item.color, flexShrink: 0 }} />
          </Box>
        );
      })}
    </Box>
  );
}

// ==========================================
// 期間トグルスイッチ
// ==========================================
function PeriodToggle({ value, onChange }: { value: Period; onChange: (v: Period) => void; }) {
  return (
    <ToggleButtonGroup value={value} exclusive onChange={(_, v) => v && onChange(v)} size="small" sx={{
        backgroundColor: 'background.subtle', borderRadius: '10px', p: 0.4,
        '& .MuiToggleButton-root': {
          border: 'none', borderRadius: '8px !important',
          fontWeight: 'bold', fontSize: '12px', px: 1.5, py: 0.5, color: 'text.disabled',
          '&.Mui-selected': { backgroundColor: 'background.paper', color: 'primary.main', boxShadow: (t) => t.customShadows.sm },
        },
      }}>
      <ToggleButton value="7d">7日間</ToggleButton>
      <ToggleButton value="30d">30日間</ToggleButton>
      <ToggleButton value="1y">1年間</ToggleButton>
    </ToggleButtonGroup>
  );
}

// ==========================================
// メインコンポーネント
// ==========================================
export default function Report() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [period, setPeriod] = useState<Period>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);

  const fetchAllLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('study_logs').select(`id, material_id, study_datetime, duration_minutes, materials ( title, image_url, categories ( name, color_code ) )`).eq('user_id', user.id).order('study_datetime', { ascending: true });
      if (error) throw error;
      setAllLogs((data ?? []).map((row: any) => ({
        id: row.id, materialId: row.material_id ?? null, materialName: row.materials?.title ?? null, materialImage: row.materials?.image_url ?? null, colorCode: row.materials?.categories?.color_code ?? null, studyDatetime: row.study_datetime, durationMinutes: row.duration_minutes ?? null,
      })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAllLogs(); }, [fetchAllLogs]);

  const periodLogs = useMemo(() => {
    const start = getPeriodStart(period);
    return allLogs.filter(l => toLocalDate(l.studyDatetime) >= start);
  }, [allLogs, period]);

  const todayMinutes = useMemo(() => {
    const today = todayStr();
    return allLogs.filter(l => toLocalDate(l.studyDatetime) === today).reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  }, [allLogs]);

  const thisMonthMinutes = useMemo(() => {
    const start = thisMonthStart();
    return allLogs.filter(l => toLocalDate(l.studyDatetime) >= start).reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  }, [allLogs]);

  const grandTotalMinutes = useMemo(() => allLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0), [allLogs]);

  const pieData = useMemo(() => buildPieData(periodLogs, theme.palette.chart), [periodLogs, theme.palette.chart]);
  const barData = useMemo(() => buildStackedBarData(periodLogs, period), [periodLogs, period]);
  const periodTotalMinutes = useMemo(() => periodLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0), [periodLogs]);

  const { barMax, yTicks } = useMemo(() => {
    const max = Math.max(...barData.map(d => pieData.reduce((sum, p) => sum + ((d[p.key] as number) || 0), 0)), 1);
    const step = max <= 60 ? 15 : max <= 180 ? 30 : max <= 360 ? 60 : 120;
    const calculatedMax = Math.ceil(max / step) * step;
    const ticks = [];
    for (let i = 0; i <= calculatedMax; i += step) ticks.push(i);
    return { barMax: calculatedMax, yTicks: ticks };
  }, [barData, pieData]);

  const pieDataWithTotal = useMemo(() => pieData.map(d => ({ ...d, __total: periodTotalMinutes })), [pieData, periodTotalMinutes]);
  const hasData = barData.some(d => pieData.some(p => (d[p.key] as number) > 0));
  const currentMonth = new Date().getMonth() + 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3, color: 'text.primary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
          <BarChartOutlinedIcon />
        </Box>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>レポート</Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 0, pb: 0 }}>
          <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 2, mb: isMobile ? 2 : 3 }}>
            <SummaryCard icon={<AccessTimeRoundedIcon />} label="今日の学習時間" value={formatDuration(todayMinutes)} colorKey="streak" />
            <SummaryCard icon={<DateRangeRoundedIcon />} label={`${currentMonth}月の学習時間`} value={formatDurationHoursOnly(thisMonthMinutes)} colorKey="primary" />
            <SummaryCard icon={<InsightsIcon />} label="総学習時間" value={formatDurationHoursOnly(grandTotalMinutes)} colorKey="success" />
          </Box>

          <Box sx={{ backgroundColor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider', p: isMobile ? 2 : 3, mb: isMobile ? 2 : 3, boxShadow: theme.customShadows.sm }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>学習時間の推移</Typography>
              <PeriodToggle value={period} onChange={setPeriod} />
            </Box>
            {!hasData ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: 'text.disabled' }}>
                <BarChartOutlinedIcon sx={{ fontSize: 56, mb: 1 }} /><Typography variant="body2">この期間の記録はありません</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.palette.text.disabled }} axisLine={false} tickLine={false} interval={period === '30d' ? 4 : 0} />
                  <YAxis tickFormatter={formatDurationShort} tick={{ fontSize: 11, fill: theme.palette.text.disabled }} axisLine={false} tickLine={false} width={isMobile ? 42 : 60} domain={[0, barMax]} ticks={yTicks} />
                  <RechartsTooltip content={(props) => <CustomStackedBarTooltip {...props} />} cursor={{ fill: theme.palette.action.hover, radius: 6 }} />
                  {pieData.map((mat, i) => (
                    <Bar key={mat.key} dataKey={mat.key} name={mat.name} stackId="a" fill={mat.color} radius={i === pieData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1.5 : 3, mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0, backgroundColor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider', p: isMobile ? 2 : 3, boxShadow: theme.customShadows.sm }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 2 }}>
                教材別 学習時間の割合 <Typography component="span" variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>{PERIOD_LABELS[period]}</Typography>
              </Typography>
              {pieData.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: 'text.disabled' }}><MenuBookOutlinedIcon sx={{ fontSize: 56, mb: 1 }} /><Typography variant="body2">この期間の記録はありません</Typography></Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative', width: '100%' }}>
                    <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 0 }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', lineHeight: 1 }}>合計</Typography>
                      <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: 'text.primary', lineHeight: 1.3 }}>{formatDuration(periodTotalMinutes)}</Typography>
                    </Box>
                    <ResponsiveContainer width="100%" height={200} style={{ position: 'relative', zIndex: 1 }}>
                      <PieChart>
                        <Pie data={pieDataWithTotal} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                          {pieDataWithTotal.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  <PieLegend pieData={pieData} total={periodTotalMinutes} />
                </Box>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 , backgroundColor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider', p: 3, boxShadow: theme.customShadows.sm }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 2 }}>
                教材別 学習時間ランキング <Typography component="span" variant="caption" sx={{ color: 'text.disabled', ml: 1 }}>{PERIOD_LABELS[period]}</Typography>
              </Typography>
              <MaterialRanking pieData={pieData} total={periodTotalMinutes} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}