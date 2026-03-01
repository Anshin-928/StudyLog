// src/components/Report.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Card, CardContent,
  ToggleButtonGroup, ToggleButton, Avatar, LinearProgress, Chip,
} from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import DateRangeRoundedIcon from '@mui/icons-material/DateRangeRounded';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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

// ==========================================
// 定数
// ==========================================
const PIE_COLORS = [
  '#1A73E8', '#34A853', '#EA4335', '#FBBC05',
  '#8E24AA', '#00ACC1', '#FF6D00', '#546E7A',
  '#D81B60', '#00897B',
];

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

/** 今月の1日を YYYY-MM-DD で返す */
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

/** 教材別の集計 */
function buildPieData(logs: LogEntry[]): PieItem[] {
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
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

/** 積み上げ棒グラフ用データ */
type StackedBarItem = Record<string, string | number>;

function buildStackedBarData(
  logs: LogEntry[],
  period: Period,
): StackedBarItem[] {
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

  // 1y: 月別
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
const CustomStackedBarTooltip = ({
  active, payload,
}: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const fullLabel = payload[0]?.payload?.fullLabel ?? payload[0]?.payload?.label;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  if (total === 0) return null;

  const segments = [...payload].reverse().filter((p: any) => p.value > 0);

  return (
    <Box sx={{
      backgroundColor: '#fff', border: '1px solid #e0e0e0',
      borderRadius: '12px', px: 2, py: 1.5,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      minWidth: '180px', zIndex: 10,
    }}>
      <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1, fontWeight: 'bold' }}>
        {fullLabel}
      </Typography>
      {segments.map((p: any) => (
        <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.fill, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ flexGrow: 1, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
            {p.name}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#333', flexShrink: 0 }}>
            {formatDuration(p.value)}
          </Typography>
        </Box>
      ))}
      {segments.length > 1 && (
        <Box sx={{ borderTop: '1px solid #eee', mt: 0.75, pt: 0.75, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: '#888' }}>合計</Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1A73E8' }}>
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
  if (!active || !payload || payload.length === 0) return null;
  const { name, value, color } = payload[0].payload;
  const total = payload[0].payload.__total ?? value;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{
      backgroundColor: '#fff', border: '1px solid #e0e0e0',
      borderRadius: '12px', px: 2, py: 1.5,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      maxWidth: '200px', zIndex: 10,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
        <Typography variant="caption" sx={{ color: '#555', fontWeight: 'bold' }}>{name}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>
        {formatDuration(value)}
      </Typography>
      <Typography variant="caption" sx={{ color: '#1A73E8', fontWeight: 'bold' }}>
        {pct}%
      </Typography>
    </Box>
  );
};

// ==========================================
// サマリーカード
// ==========================================
function SummaryCard({
  icon, label, value, sub, color = '#1A73E8',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card sx={{
      flex: 1, minWidth: '160px',
      borderRadius: '16px', border: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      transition: '0.2s',
      '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' },
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '11px',
          backgroundColor: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, mb: 1.5,
        }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ color: '#999', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 'bold', fontSize: '22px', color: '#222', lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: '#bbb', display: 'block', mt: 0.5 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// 教材別ランキング
// ==========================================
function MaterialRanking({
  pieData, total,
}: {
  pieData: PieItem[];
  total: number;
}) {
  if (pieData.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, color: '#ccc' }}>
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
                fontSize: '13px', color: i < 3 ? item.color : '#bbb', flexShrink: 0,
              }}>
                {i + 1}
              </Typography>
              {item.image ? (
                <Avatar
                  src={item.image} variant="rounded"
                  sx={{ width: 32, height: 32, flexShrink: 0, backgroundColor: '#f5f5f5' }}
                />
              ) : (
                <Avatar variant="rounded" sx={{
                  width: 32, height: 32, flexShrink: 0,
                  backgroundColor: `${item.color}18`, color: item.color,
                }}>
                  <MenuBookOutlinedIcon sx={{ fontSize: '16px' }} />
                </Avatar>
              )}
              <Typography sx={{
                fontSize: '13px', fontWeight: 'bold', color: '#333',
                flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.name}
              </Typography>
              <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: '#555', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {formatDuration(item.value)}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: item.color, fontWeight: 'bold', flexShrink: 0, minWidth: '36px', textAlign: 'right' }}>
                {pct}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 6, borderRadius: 3, ml: '36px',
                backgroundColor: `${item.color}18`,
                '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 3 },
              }}
            />
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
            <Typography sx={{
              fontSize: '13px', fontWeight: 'bold', color: '#333',
              flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#888', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatDuration(item.value)}
            </Typography>
            <Chip
              label={`${pct}%`}
              size="small"
              sx={{
                height: '20px', fontSize: '11px', fontWeight: 'bold',
                backgroundColor: `${item.color}18`, color: item.color, flexShrink: 0,
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// ==========================================
// 期間トグルスイッチ（共通コンポーネント）
// ==========================================
function PeriodToggle({
  value, onChange,
}: {
  value: Period;
  onChange: (v: Period) => void;
}) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      size="small"
      sx={{
        backgroundColor: '#f5f5f5', borderRadius: '10px', p: 0.4,
        '& .MuiToggleButton-root': {
          border: 'none', borderRadius: '8px !important',
          fontWeight: 'bold', fontSize: '12px', px: 1.5, py: 0.5, color: '#888',
          '&.Mui-selected': {
            backgroundColor: '#fff', color: '#1A73E8',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          },
        },
      }}
    >
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
  const [period, setPeriod] = useState<Period>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);

  // ==========================================
  // データ取得（全ログを一括取得）
  // ==========================================
  const fetchAllLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_logs')
        .select(`
          id,
          material_id,
          study_datetime,
          duration_minutes,
          materials (
            title,
            image_url,
            categories ( name, color_code )
          )
        `)
        .order('study_datetime', { ascending: true });

      if (error) throw error;

      setAllLogs((data ?? []).map((row: any) => ({
        id: row.id,
        materialId: row.material_id ?? null,
        materialName: row.materials?.title ?? null,
        materialImage: row.materials?.image_url ?? null,
        colorCode: row.materials?.categories?.color_code ?? null,
        studyDatetime: row.study_datetime,
        durationMinutes: row.duration_minutes ?? null,
      })));
    } catch (e) {
      console.error('データ取得エラー:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllLogs(); }, [fetchAllLogs]);

  // ==========================================
  // 期間でフィルタしたログ
  // ==========================================
  const periodLogs = useMemo(() => {
    const start = getPeriodStart(period);
    return allLogs.filter(l => toLocalDate(l.studyDatetime) >= start);
  }, [allLogs, period]);

  // ==========================================
  // サマリーカード用（固定・期間に依存しない）
  // ==========================================
  const todayMinutes = useMemo(() => {
    const today = todayStr();
    return allLogs
      .filter(l => toLocalDate(l.studyDatetime) === today)
      .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  }, [allLogs]);

  const thisMonthMinutes = useMemo(() => {
    const start = thisMonthStart();
    return allLogs
      .filter(l => toLocalDate(l.studyDatetime) >= start)
      .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  }, [allLogs]);

  const grandTotalMinutes = useMemo(() => {
    return allLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);
  }, [allLogs]);

  // ==========================================
  // 期間連動データ（グラフ・円グラフ・ランキング）
  // ==========================================
  const pieData = useMemo(() => buildPieData(periodLogs), [periodLogs]);

  const barData = useMemo(
    () => buildStackedBarData(periodLogs, period),
    [periodLogs, period],
  );

  const periodTotalMinutes = useMemo(
    () => periodLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0),
    [periodLogs],
  );

  // 棒グラフの最大値
  const barMax = useMemo(() => {
    const max = Math.max(...barData.map(d => {
      return pieData.reduce((sum, p) => sum + ((d[p.key] as number) || 0), 0);
    }), 1);
    const step = max <= 60 ? 30 : max <= 180 ? 60 : max <= 360 ? 120 : 180;
    return Math.ceil(max / step) * step;
  }, [barData, pieData]);

  // 円グラフ用：合計を付加
  const pieDataWithTotal = useMemo(
    () => pieData.map(d => ({ ...d, __total: periodTotalMinutes })),
    [pieData, periodTotalMinutes],
  );

  const yAxisFormatter = (value: number) => {
    if (value === 0) return '0';
    return formatDurationShort(value);
  };

  const hasData = barData.some(d => pieData.some(p => (d[p.key] as number) > 0));

  // 今月表示用
  const currentMonth = new Date().getMonth() + 1;

  // ==========================================
  // レンダリング
  // ==========================================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* ヘッダー（期間トグルなし） */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: '32px' } }}>
          <BarChartOutlinedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#333' }}>レポート</Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>

          {/* ========== サマリーカード（固定3枚） ========== */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <SummaryCard
              icon={<WbSunnyRoundedIcon />}
              label="今日の学習時間"
              value={todayMinutes > 0 ? formatDuration(todayMinutes) : '---'}
              sub={todayMinutes > 0 ? '今日も頑張りました！' : 'まだ記録がありません'}
              color="#FF6B00"
            />
            <SummaryCard
              icon={<DateRangeRoundedIcon />}
              label={`${currentMonth}月の学習時間`}
              value={thisMonthMinutes > 0 ? formatDuration(thisMonthMinutes) : '---'}
              sub={thisMonthMinutes > 0 ? `${Math.round(thisMonthMinutes / 60 * 10) / 10}時間` : undefined}
              color="#1A73E8"
            />
            <SummaryCard
              icon={<AccessTimeRoundedIcon />}
              label="総学習時間"
              value={grandTotalMinutes > 0 ? formatDuration(grandTotalMinutes) : '---'}
              sub={grandTotalMinutes > 0 ? `${Math.round(grandTotalMinutes / 60 * 10) / 10}時間` : 'これから積み上げていきましょう'}
              color="#34A853"
            />
          </Box>

          {/* ========== 積み上げ棒グラフ（期間トグル付き） ========== */}
          <Box sx={{
            backgroundColor: '#fff', borderRadius: '20px',
            border: '1px solid #f0f0f0', p: 3, mb: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333' }}>
                学習時間の推移
              </Typography>
              <PeriodToggle value={period} onChange={setPeriod} />
            </Box>

            {!hasData ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: '#ccc' }}>
                <BarChartOutlinedIcon sx={{ fontSize: 56, mb: 1 }} />
                <Typography variant="body2">この期間の記録はありません</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#aaa' }}
                    axisLine={false}
                    tickLine={false}
                    interval={period === '30d' ? 4 : 0}
                  />
                  <YAxis
                    tickFormatter={yAxisFormatter}
                    tick={{ fontSize: 11, fill: '#aaa' }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    domain={[0, barMax]}
                  />
                  <Tooltip
                    content={(props) => <CustomStackedBarTooltip {...props} pieData={pieData} />}
                    cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }}
                  />
                  {pieData.map((mat, i) => (
                    <Bar
                      key={mat.key}
                      dataKey={mat.key}
                      name={mat.name}
                      stackId="a"
                      fill={mat.color}
                      radius={i === pieData.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Box>

          {/* ========== 円グラフ + 教材ランキング（期間トグルに連動） ========== */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>

            {/* 円グラフ */}
            <Box sx={{
              flex: '1 1 300px',
              backgroundColor: '#fff', borderRadius: '20px',
              border: '1px solid #f0f0f0', p: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333', mb: 2 }}>
                教材別 学習時間の割合
                <Typography component="span" variant="caption" sx={{ color: '#aaa', ml: 1 }}>
                  {PERIOD_LABELS[period]}
                </Typography>
              </Typography>

              {pieData.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: '#ccc' }}>
                  <MenuBookOutlinedIcon sx={{ fontSize: 56, mb: 1 }} />
                  <Typography variant="body2">この期間の記録はありません</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  {/* ★ z-index 修正: 中央テキストを下層に配置し、Tooltipが上に来るようにする */}
                  <Box sx={{ position: 'relative', width: '100%' }}>
                    {/* 中央の合計テキスト（z-index: 0 = 背面） */}
                    <Box sx={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}>
                      <Typography variant="caption" sx={{ color: '#aaa', display: 'block', lineHeight: 1 }}>合計</Typography>
                      <Typography sx={{ fontWeight: 'bold', fontSize: '16px', color: '#333', lineHeight: 1.3 }}>
                        {formatDuration(periodTotalMinutes)}
                      </Typography>
                    </Box>
                    {/* PieChart（z-index: 1 = Tooltip が前面に来る） */}
                    <ResponsiveContainer width="100%" height={200} style={{ position: 'relative', zIndex: 1 }}>
                      <PieChart>
                        <Pie
                          data={pieDataWithTotal}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {pieDataWithTotal.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>

                  <PieLegend pieData={pieData} total={periodTotalMinutes} />
                </Box>
              )}
            </Box>

            {/* 教材ランキング */}
            <Box sx={{
              flex: '1 1 300px',
              backgroundColor: '#fff', borderRadius: '20px',
              border: '1px solid #f0f0f0', p: 3,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333', mb: 2 }}>
                教材別 学習時間ランキング
                <Typography component="span" variant="caption" sx={{ color: '#aaa', ml: 1 }}>
                  {PERIOD_LABELS[period]}
                </Typography>
              </Typography>
              <MaterialRanking pieData={pieData} total={periodTotalMinutes} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}