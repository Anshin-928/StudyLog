// src/components/Report.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, CircularProgress,
  ToggleButtonGroup, ToggleButton, LinearProgress, Chip,
  useMediaQuery, useTheme, alpha,
  IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';
import {
  type Period, type LogEntry, type PieItem,
  type TrendViewMode,
  PERIOD_LABELS,
  formatDuration, formatDurationHoursOnly, formatDurationShort,
  todayStr, toLocalDate, shortDate, shortMonth,
  thisMonthStart, getPeriodStart,
  getPeriodInfo, formatPeriodRange,
  getTrendPeriodInfo, formatTrendPeriodRange, getDow, getWeekSunday,
  buildPieData, buildStackedBarData,
} from '../lib/reportUtils';

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
          <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
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
// 教材別ランキング
// ==========================================
function MaterialRanking({ pieData, total }: { pieData: PieItem[]; total: number }) {
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
                <Box component="img" src={item.image} sx={{ width: 32, height: 44, flexShrink: 0, objectFit: 'cover', borderRadius: '4px', border: '1px solid', borderColor: 'divider' }} />
              ) : (
                <Box sx={{ width: 32, height: 44, flexShrink: 0, borderRadius: '4px', backgroundColor: alpha(item.color, 0.12), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider' }}>
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
            <LinearProgress
              variant="determinate" value={pct}
              sx={{ height: 6, borderRadius: 3, ml: '36px', backgroundColor: alpha(item.color, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 3 } }}
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
function PeriodToggle({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <ToggleButtonGroup
      value={value} exclusive onChange={(_, v) => v && onChange(v)} size="small"
      sx={{
        backgroundColor: 'background.subtle', borderRadius: '10px', p: 0.4,
        '& .MuiToggleButton-root': {
          border: 'none', borderRadius: '8px !important',
          fontWeight: 'bold', fontSize: '12px', px: 1.5, py: 0.5, color: 'text.disabled',
          '&.Mui-selected': { backgroundColor: 'background.paper', color: 'primary.main', boxShadow: (t) => t.customShadows.sm },
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
// 学習推移 詳細ビュー (インライン切り替え)
// ==========================================
function TrendDetailsView({
  onBack, allLogs,
}: {
  onBack: () => void;
  allLogs: LogEntry[];
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const chartColors = theme.palette.chart;

  const [viewMode, setViewMode] = useState<TrendViewMode>('day');
  const [offset, setOffset] = useState(0);

  useEffect(() => { setOffset(0); }, [viewMode]);

  const { startDate, endDate, endDateFull, dates } = useMemo(
    () => getTrendPeriodInfo(viewMode, offset),
    [viewMode, offset],
  );

  const { barData, materials, barMax, yTicks } = useMemo(() => {
    // ログを期間でフィルタ
    const targetLogs = allLogs.filter(l => {
      const logDate = toLocalDate(l.studyDatetime);
      if (viewMode === 'month') {
        return logDate.slice(0, 7) >= startDate && logDate.slice(0, 7) <= endDate;
      }
      return logDate >= startDate && logDate <= endDateFull;
    });

    // 教材マップ
    const matMap = new Map<string, { name: string; total: number; image: string | null }>();
    targetLogs.forEach(l => {
      if ((l.durationMinutes ?? 0) <= 0) return;
      const key = l.materialId ?? '__none__';
      const name = l.materialName ?? '教材なし';
      if (!matMap.has(key)) matMap.set(key, { name, total: 0, image: l.materialImage });
      matMap.get(key)!.total += l.durationMinutes!;
    });

    const materials = Array.from(matMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.total - a.total)
      .map((m, i) => ({ ...m, color: chartColors[i % chartColors.length] }));

    const barData = dates.map(dateStr => {
      const isMonth = viewMode === 'month';
      const isWeek = viewMode === 'week';

      let label: string;
      let tableLabel: string;
      let fullLabel: string;

      if (isMonth) {
        const mo = parseInt(dateStr.split('-')[1]);
        label = `${mo}月`;
        tableLabel = `${mo}月`;
        fullLabel = shortMonth(dateStr);
      } else if (isWeek) {
        const sundayStr = getWeekSunday(dateStr);
        label = `${shortDate(dateStr)}\n${getDow(dateStr)}`;
        tableLabel = shortDate(dateStr);
        fullLabel = `${shortDate(dateStr)}(${getDow(dateStr)}) 〜 ${shortDate(sundayStr)}(${getDow(sundayStr)})`;
      } else {
        label = `${shortDate(dateStr)}\n${getDow(dateStr)}`;
        tableLabel = shortDate(dateStr);
        fullLabel = `${shortDate(dateStr)}(${getDow(dateStr)})`;
      }

      const item: Record<string, any> = { label, tableLabel, fullLabel, date: dateStr, total: 0 };

      const dayLogs = targetLogs.filter(l => {
        const logDate = toLocalDate(l.studyDatetime);
        if (isMonth) return logDate.slice(0, 7) === dateStr;
        if (isWeek) {
          const sundayStr = getWeekSunday(dateStr);
          return logDate >= dateStr && logDate <= sundayStr;
        }
        return logDate === dateStr;
      });

      dayLogs.forEach(l => {
        if ((l.durationMinutes ?? 0) <= 0) return;
        const key = l.materialId ?? '__none__';
        item[key] = (item[key] || 0) + l.durationMinutes!;
        item.total += l.durationMinutes!;
      });
      return item;
    });

    const max = Math.max(...barData.map(d => d.total as number), 1);
    const step = max <= 60 ? 15 : max <= 180 ? 30 : max <= 360 ? 60 : max <= 720 ? 120 : 240;
    const calculatedMax = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let i = 0; i <= calculatedMax; i += step) ticks.push(i);

    return { barData, materials, barMax: calculatedMax, yTicks: ticks };
  }, [allLogs, dates, startDate, endDate, endDateFull, viewMode, chartColors]);

  const periodTotalMinutes = useMemo(
    () => barData.reduce((sum, d) => sum + (d.total as number), 0),
    [barData],
  );


  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', width: '100%', animation: 'fadeIn 0.2s ease-out',
      pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2
    }}>

      {/* 画面ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: isMobile ? 2 : 3, color: 'text.primary' }}>
        <IconButton onClick={onBack} sx={{ mr: 0.5, color: 'text.primary' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          学習時間の推移
        </Typography>
        {periodTotalMinutes > 0 && (
          <Typography variant="subtitle2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
            合計 {formatDuration(periodTotalMinutes)}
          </Typography>
        )}
      </Box>

      {/* 日 / 週 / 月 タブ */}
      <Box sx={{
        display: 'flex', backgroundColor: 'background.paper', borderRadius: '14px',
        border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2.5,
      }}>
        {(['day', 'week', 'month'] as TrendViewMode[]).map(mode => (
          <Box
            key={mode} onClick={() => setViewMode(mode)}
            sx={{
              flex: 1, textAlign: 'center', py: 1.5, cursor: 'pointer',
              borderBottom: '3px solid',
              borderBottomColor: viewMode === mode ? 'primary.main' : 'transparent',
              fontWeight: 'bold', fontSize: '15px',
              color: viewMode === mode ? 'primary.main' : 'text.secondary',
              transition: 'all 0.15s', userSelect: 'none', '&:hover': { color: 'text.primary' },
            }}
          >
            {mode === 'day' ? '日' : mode === 'week' ? '週' : '月'}
          </Box>
        ))}
      </Box>

      {/* 期間ナビゲーション */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, gap: 0.5 }}>
        <IconButton onClick={() => setOffset(o => o + 1)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '15px', sm: '16px' }, color: 'text.primary', textAlign: 'center', minWidth: { xs: '200px', sm: '280px' } }}>
          {formatTrendPeriodRange(startDate, endDateFull, viewMode)}
        </Typography>
        <IconButton onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} size="small" sx={{ color: offset === 0 ? 'text.disabled' : 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      {/* ── 棒グラフ＋教材別内訳 統合テーブル ── */}
      {materials.length === 0 ? (
        <Box sx={{
          backgroundColor: 'background.paper', borderRadius: '16px',
          border: '1px solid', borderColor: 'divider', py: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.disabled', mb: 2,
        }}>
          <BarChartOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2">この期間の記録はありません</Typography>
        </Box>
      ) : (() => {
        const BAR_AREA_H = isMobile ? 180 : 200;
        const ICON_COL_W = isMobile ? 46 : 60;
        const RIGHT_PAD_W = isMobile ? 6 : 16;

        // 各tickのボトムからのpx位置
        const effectiveH = BAR_AREA_H - 24; // ラベル用余白を除いた有効高さ
        const tickPositions = yTicks.map(t => ({
          value: t,
          bottomPx: barMax > 0 ? (t / barMax) * effectiveH : 0,
        }));

        return (
          <Box sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: '16px',
            overflowX: 'hidden', mb: 2, backgroundColor: 'background.paper',
          }}>
            <Table
              size="small"
              sx={{
                borderCollapse: 'separate', borderSpacing: 0,
                tableLayout: 'fixed',
                width: '100%',
                minWidth: isMobile ? '100%' : ICON_COL_W + barData.length * 60 + RIGHT_PAD_W,
              }}
            >
              <colgroup>
                <col style={{ width: ICON_COL_W }} />
                {barData.map(d => <col key={d.date} />)}
                <col style={{ width: RIGHT_PAD_W }} />
              </colgroup>

              <TableBody>
                {/* 棒グラフ行 */}
                <TableRow>
                  <TableCell sx={{
                    p: 0, border: 'none',
                    verticalAlign: 'bottom',
                  }}>
                    <Box sx={{ height: BAR_AREA_H, position: 'relative', width: '100%' }}>
                      {tickPositions.map(tp => (
                        <Typography key={tp.value} sx={{
                          position: 'absolute',
                          bottom: tp.bottomPx - 6,
                          right: isMobile ? 4 : 8, // 右に寄せてグラフに近づける
                          fontSize: isMobile ? '9px' : '10px',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                        }}>
                          {formatDurationShort(tp.value)}
                        </Typography>
                      ))}
                    </Box>
                  </TableCell>

                  {/* 各日付の棒グラフセル */}
                  {barData.map(d => {
                    const total = d.total as number;
                    const barTopPx = barMax > 0 ? (total / barMax) * effectiveH : 0;
                    return (
                      <TableCell
                        key={d.date}
                        align="center"
                        sx={{ p: 0, border: 'none', verticalAlign: 'bottom' }}
                      >
                        <Box sx={{
                          height: BAR_AREA_H,
                          position: 'relative',
                          display: 'flex', flexDirection: 'column',
                          justifyContent: 'flex-end', alignItems: 'center',
                          px: isMobile ? '25%' : '30%',
                        }}>
                          {/* 横グリッド線 */}
                          {tickPositions.map(tp => (
                            <Box key={tp.value} sx={{
                              position: 'absolute',
                              left: 0, right: 0,
                              bottom: tp.bottomPx,
                              height: '1px',
                              backgroundColor: 'divider',
                              opacity: 0.5,
                              zIndex: 0
                            }} />
                          ))}

                          {/* 合計ラベル（棒のすぐ上） */}
                          {total > 0 && (
                            <Typography sx={{
                              position: 'absolute',
                              bottom: barTopPx + 4,
                              fontSize: isMobile ? '9px' : '10px',
                              fontWeight: 'bold',
                              color: 'text.secondary',
                              lineHeight: 1.2,
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              zIndex: 2,
                            }}>
                              {/* スマホ時は "1h30m" のように短くして横幅を節約 */}
                              {isMobile ? formatDurationShort(total) : formatDuration(total)}
                            </Typography>
                          )}

                          <Box sx={{
                            width: '100%',
                            display: 'flex', flexDirection: 'column-reverse',
                            borderRadius: '4px 4px 0 0', overflow: 'hidden',
                            position: 'relative', zIndex: 1,
                          }}>
                            {materials.map((mat, mi) => {
                              const val = (d[mat.key] as number) || 0;
                              if (!val || !barMax) return null;
                              const h = Math.max((val / barMax) * effectiveH, 1);
                              return (
                                <Box key={mat.key} sx={{
                                  width: '100%', height: `${h}px`,
                                  backgroundColor: mat.color, flexShrink: 0,
                                  borderRadius: mi === materials.length - 1 ? '4px 4px 0 0' : 0,
                                }} />
                              );
                            })}
                          </Box>
                        </Box>
                      </TableCell>
                    );
                  })}

                  {/* 右端パディングセル */}
                  <TableCell sx={{ p: 0, border: 'none' }} />
                </TableRow>

                {/* 日付ラベル行（棒グラフと教材の間）*/}
                <TableRow>
                  <TableCell sx={{ border: 'none', p: 0 }} />
                  {barData.map(d => (
                    <TableCell key={d.date} align="center" sx={{
                      border: 'none',
                      pt: 1.5, pb: 1.5, px: 0,
                    }}>
                      <Typography sx={{ fontWeight: 'bold', fontSize: isMobile ? '10px' : '12px', color: 'text.primary', lineHeight: 1.3 }}>
                        {d.tableLabel}
                      </Typography>
                      {viewMode !== 'month' && (
                        <Typography sx={{ fontSize: isMobile ? '9px' : '11px', color: 'text.secondary', lineHeight: 1.2 }}>
                          {getDow(d.date)}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell sx={{ border: 'none', p: 0 }} />
                </TableRow>

                {/* 区切り線 */}
                <TableRow>
                  <TableCell colSpan={barData.length + 2} sx={{
                    p: 0, border: 'none',
                    borderTop: '1px solid', borderColor: 'divider',
                  }} />
                </TableRow>

                {/* 教材ごとに 2行（タイトル行＋時間行）*/}
                {materials.map((mat, matIdx) => {
                  const isLast = matIdx === materials.length - 1;
                  return (
                    <React.Fragment key={mat.key}>
                      {/* 行A: アイコン(rowSpan=2) ＋ タイトル */}
                      <TableRow>
                        <TableCell
                          rowSpan={2}
                          sx={{
                            backgroundColor: 'background.paper',
                            border: 'none',
                            borderBottom: isLast ? 'none' : '1px solid',
                            borderBottomColor: 'divider',
                            verticalAlign: 'middle',
                            p: isMobile ? '8px 2px 8px 6px' : '8px 10px', // 余白を削る
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            {/* カラーバー */}
                            <Box sx={{
                              position: 'absolute', left: isMobile ? -6 : -10, top: '50%', transform: 'translateY(-50%)',
                              width: 3, height: 36, backgroundColor: mat.color, borderRadius: '0 2px 2px 0',
                            }} />
                            {mat.image ? (
                              <Box component="img" src={mat.image} sx={{
                                width: isMobile ? 24 : 30, height: isMobile ? 34 : 42, objectFit: 'cover', 
                                borderRadius: '4px',
                                border: '1px solid', borderColor: 'divider',
                              }} />
                            ) : (
                              <Box sx={{
                                width: isMobile ? 24 : 30, height: isMobile ? 34 : 42,
                                backgroundColor: alpha(mat.color, 0.1),
                                borderRadius: '4px', display: 'flex', alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid', borderColor: 'divider',
                              }}>
                                <MenuBookOutlinedIcon sx={{ fontSize: '14px', color: mat.color }} />
                              </Box>
                            )}
                          </Box>
                        </TableCell>

                        {/* タイトル */}
                        <TableCell colSpan={barData.length + 1} sx={{
                          border: 'none', pt: 1.5, pb: 0.25, px: 0.5,
                        }}>
                          <Typography sx={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', color: 'text.primary', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mat.name}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {/* 行B: 各日付の学習時間 */}
                      <TableRow>
                        {barData.map(d => {
                          const val = (d[mat.key] as number) || 0;
                          return (
                            <TableCell key={d.date} align="center" sx={{
                              border: 'none',
                              borderBottom: isLast ? 'none' : '1px solid',
                              borderBottomColor: 'divider',
                              color: val ? 'text.primary' : 'text.disabled',
                              fontWeight: val ? 'bold' : 'normal',
                              fontSize: isMobile ? '10px' : '12px', whiteSpace: 'nowrap',
                              pt: 0.25, pb: 1.5, px: 0,
                            }}>
                              {val === 0 ? '0分' : (isMobile ? formatDurationShort(val) : formatDuration(val))}
                            </TableCell>
                          );
                        })}
                        {/* 右端の空セル */}
                        <TableCell sx={{
                          border: 'none',
                          borderBottom: isLast ? 'none' : '1px solid',
                          borderBottomColor: 'divider',
                        }} />
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        );
      })()}
    </Box>
  );
}

// ==========================================
// 教材別割合 詳細ビュー
// ==========================================
function PieDetailsView({
  onBack,
  allLogs,
}: {
  onBack: () => void;
  allLogs: LogEntry[];
}) {
  type PieDetailTab = '1d' | '7d' | '30d';

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState<PieDetailTab>('1d');
  const [offset, setOffset] = useState(0);

  useEffect(() => { setOffset(0); }, [tab]);

  const { startDate, endDate } = useMemo(() => {
    const daysPerPeriod = tab === '1d' ? 1 : tab === '7d' ? 7 : 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDay = new Date(today);
    endDay.setDate(endDay.getDate() - daysPerPeriod * offset);
    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - daysPerPeriod + 1);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: fmt(startDay), endDate: fmt(endDay) };
  }, [tab, offset]);

  const filteredLogs = useMemo(
    () => allLogs.filter(l => {
      const d = toLocalDate(l.studyDatetime);
      return d >= startDate && d <= endDate;
    }),
    [allLogs, startDate, endDate],
  );

  const pieData = useMemo(
    () => buildPieData(filteredLogs, theme.palette.chart),
    [filteredLogs, theme.palette.chart],
  );

  const totalMinutes = useMemo(
    () => filteredLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0),
    [filteredLogs],
  );

  const pieDataWithTotal = useMemo(
    () => pieData.map(d => ({ ...d, __total: totalMinutes })),
    [pieData, totalMinutes],
  );

  const periodRangeLabel = useMemo(() => {
    const fmtShort = (s: string) => {
      const [, m, d] = s.split('-').map(Number);
      return `${m}月${d}日`;
    };
    if (tab === '1d') return fmtShort(startDate);
    return `${fmtShort(startDate)} 〜 ${fmtShort(endDate)}`;
  }, [startDate, endDate, tab]);

  const PIE_TAB_LABELS: Record<PieDetailTab, string> = { '1d': '日', '7d': '週', '30d': '月' };

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', width: '100%', animation: 'fadeIn 0.2s ease-out',
      pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2,
    }}>
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: isMobile ? 2 : 3, color: 'text.primary' }}>
        <IconButton onClick={onBack} sx={{ mr: 0.5, color: 'text.primary' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          教材別の割合
        </Typography>
        {totalMinutes > 0 && (
          <Typography variant="subtitle2" sx={{ color: 'text.disabled', fontWeight: 'bold' }}>
            合計 {formatDuration(totalMinutes)}
          </Typography>
        )}
      </Box>

      {/* 期間タブ */}
      <Box sx={{
        display: 'flex', backgroundColor: 'background.paper', borderRadius: '14px',
        border: '1px solid', borderColor: 'divider', overflow: 'hidden', mb: 2.5,
      }}>
        {(['1d', '7d', '30d'] as PieDetailTab[]).map(p => (
          <Box
            key={p} onClick={() => setTab(p)}
            sx={{
              flex: 1, textAlign: 'center', py: 1.5, cursor: 'pointer',
              borderBottom: '3px solid',
              borderBottomColor: tab === p ? 'primary.main' : 'transparent',
              fontWeight: 'bold', fontSize: '15px',
              color: tab === p ? 'primary.main' : 'text.secondary',
              transition: 'all 0.15s', userSelect: 'none', '&:hover': { color: 'text.primary' },
            }}
          >
            {PIE_TAB_LABELS[p]}
          </Box>
        ))}
      </Box>

      {/* 期間ナビゲーション */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, gap: 0.5 }}>
        <IconButton onClick={() => setOffset(o => o + 1)} size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ChevronLeftRoundedIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '15px', sm: '16px' }, color: 'text.primary', textAlign: 'center', minWidth: { xs: '200px', sm: '280px' } }}>
          {periodRangeLabel}
        </Typography>
        <IconButton onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} size="small" sx={{ color: offset === 0 ? 'text.disabled' : 'text.secondary', '&:hover': { color: 'text.primary' } }}>
          <ChevronRightRoundedIcon />
        </IconButton>
      </Box>

      {pieData.length === 0 ? (
        <Box sx={{
          backgroundColor: 'background.paper', borderRadius: '16px',
          border: '1px solid', borderColor: 'divider', py: 6,
          display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.disabled', mb: 2,
        }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="body2">この期間の記録はありません</Typography>
        </Box>
      ) : (
        <>
          {/* ドーナツグラフ */}
          <Box sx={{
            backgroundColor: 'background.paper', borderRadius: '16px',
            border: '1px solid', borderColor: 'divider',
            p: isMobile ? 2 : 3, mb: 2,
          }}>
            <Box sx={{ position: 'relative', width: '100%' }}>
              <Box sx={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none', zIndex: 0,
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>合計</Typography>
                <Typography sx={{ fontWeight: 'bold', fontSize: isMobile ? '19px' : '21px', color: 'text.primary', lineHeight: 1.3 }}>
                  {formatDuration(totalMinutes)}
                </Typography>
              </Box>
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 260} style={{ position: 'relative', zIndex: 1 }}>
                <PieChart key={`${startDate}-${endDate}`}>
                  <Pie
                    data={pieDataWithTotal}
                    cx="50%" cy="50%"
                    innerRadius={isMobile ? 60 : 75} outerRadius={isMobile ? 90 : 110}
                    paddingAngle={0} dataKey="value"
                    startAngle={90} endAngle={-270}
                    stroke={theme.palette.background.paper}
                    strokeWidth={pieDataWithTotal.length === 1 ? 0 : 0.5}
                  >
                    {pieDataWithTotal.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* 教材別詳細リスト */}
          <Box sx={{
            backgroundColor: 'background.paper', borderRadius: '16px',
            border: '1px solid', borderColor: 'divider', overflow: 'hidden',
          }}>
            {pieData.map((item, i) => {
              const pct = totalMinutes > 0 ? Math.round((item.value / totalMinutes) * 100) : 0;
              const isLast = i === pieData.length - 1;
              return (
                <Box key={item.key} sx={{
                  px: isMobile ? 2 : 3, py: 2,
                  borderBottom: isLast ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    {/* ランク */}
                    <Typography sx={{
                      width: 20, textAlign: 'center', fontWeight: 'bold',
                      fontSize: '13px', color: i < 3 ? item.color : 'text.disabled', flexShrink: 0,
                    }}>
                      {i + 1}
                    </Typography>
                    {/* 画像 */}
                    {item.image ? (
                      <Box component="img" src={item.image} sx={{ width: 32, height: 44, flexShrink: 0, objectFit: 'cover', borderRadius: '4px', border: '1px solid', borderColor: 'divider' }} />
                    ) : (
                      <Box sx={{ width: 32, height: 44, flexShrink: 0, borderRadius: '4px', backgroundColor: alpha(item.color, 0.12), color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider' }}>
                        <MenuBookOutlinedIcon sx={{ fontSize: '18px' }} />
                      </Box>
                    )}
                    {/* 教材名 */}
                    <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.primary', flexGrow: 1, minWidth: 0, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, lineHeight: 1.3 }}>
                      {item.name}
                    </Typography>
                    {/* 時間 */}
                    <Typography sx={{ fontSize: '13px', fontWeight: 'bold', color: 'text.secondary', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {formatDuration(item.value)}
                    </Typography>
                    {/* パーセント */}
                    <Chip label={`${pct}%`} size="small" sx={{ height: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: alpha(item.color, 0.12), color: item.color, flexShrink: 0 }} />
                  </Box>
                  {/* プログレスバー */}
                  <LinearProgress
                    variant="determinate" value={pct}
                    sx={{ height: 6, borderRadius: 3, ml: '36px', backgroundColor: alpha(item.color, 0.12), '& .MuiLinearProgress-bar': { backgroundColor: item.color, borderRadius: 3 } }}
                  />
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
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
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [isPieDialogOpen, setIsPieDialogOpen] = useState(false);

  const fetchAllLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('study_logs')
        .select(`id, material_id, study_datetime, duration_minutes, materials ( title, image_url, categories ( name, color_code ) )`)
        .eq('user_id', user.id)
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
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllLogs(); }, [fetchAllLogs]);

  const periodLogs = useMemo(() => {
    const start = getPeriodStart(period);
    return allLogs.filter(l => toLocalDate(l.studyDatetime) >= start);
  }, [allLogs, period]);

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

  const grandTotalMinutes = useMemo(
    () => allLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0),
    [allLogs],
  );

  const pieData = useMemo(
    () => buildPieData(periodLogs, theme.palette.chart),
    [periodLogs, theme.palette.chart],
  );
  const barData = useMemo(
    () => buildStackedBarData(periodLogs, period),
    [periodLogs, period],
  );
  const periodTotalMinutes = useMemo(
    () => periodLogs.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0),
    [periodLogs],
  );

  const { barMax, yTicks } = useMemo(() => {
    const max = Math.max(
      ...barData.map(d => pieData.reduce((sum, p) => sum + ((d[p.key] as number) || 0), 0)),
      1,
    );
    const step = max <= 60 ? 15 : max <= 180 ? 30 : max <= 360 ? 60 : 120;
    const calculatedMax = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let i = 0; i <= calculatedMax; i += step) ticks.push(i);
    return { barMax: calculatedMax, yTicks: ticks };
  }, [barData, pieData]);

  const pieDataWithTotal = useMemo(
    () => pieData.map(d => ({ ...d, __total: periodTotalMinutes })),
    [pieData, periodTotalMinutes],
  );

  const hasData = barData.some(d => pieData.some(p => (d[p.key] as number) > 0));
  const currentMonth = new Date().getMonth() + 1;

  const { dates: summaryDates } = useMemo(() => getTrendPeriodInfo('day', 0), []);
  const { summaryBarData, summaryMaterials, summaryBarMax, summaryYTicks } = useMemo(() => {
    const targetLogs = allLogs.filter(l => summaryDates.includes(toLocalDate(l.studyDatetime)));
    
    const matMap = new Map<string, { name: string; total: number; image: string | null }>();
    targetLogs.forEach(l => {
      if ((l.durationMinutes ?? 0) <= 0) return;
      const key = l.materialId ?? '__none__';
      const name = l.materialName ?? '教材なし';
      if (!matMap.has(key)) matMap.set(key, { name, total: 0, image: l.materialImage });
      matMap.get(key)!.total += l.durationMinutes!;
    });

    const materials = Array.from(matMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.total - a.total)
      .map((m, i) => ({ ...m, color: theme.palette.chart[i % theme.palette.chart.length] }));

    const barData = summaryDates.map(dateStr => {
      const tableLabel = shortDate(dateStr);
      const item: Record<string, any> = { tableLabel, date: dateStr, total: 0 };
      const dayLogs = targetLogs.filter(l => toLocalDate(l.studyDatetime) === dateStr);
      dayLogs.forEach(l => {
        if ((l.durationMinutes ?? 0) <= 0) return;
        const key = l.materialId ?? '__none__';
        item[key] = (item[key] || 0) + l.durationMinutes!;
        item.total += l.durationMinutes!;
      });
      return item;
    });

    const max = Math.max(...barData.map(d => d.total as number), 1);
    const step = max <= 60 ? 15 : max <= 180 ? 30 : max <= 360 ? 60 : max <= 720 ? 120 : 240;
    const calculatedMax = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let i = 0; i <= calculatedMax; i += step) ticks.push(i);

    return { summaryBarData: barData, summaryMaterials: materials, summaryBarMax: calculatedMax, summaryYTicks: ticks };
  }, [allLogs, summaryDates, theme.palette.chart]);

  const statItems = [
    { label: '今日の学習', value: formatDuration(todayMinutes) },
    { label: `${currentMonth}月の学習`, value: formatDurationHoursOnly(thisMonthMinutes) },
    { label: '総学習時間', value: formatDurationHoursOnly(grandTotalMinutes) },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
        ) : isTrendDialogOpen ? (
          /* 学習時間の推移 詳細ビュー */
          <TrendDetailsView
            onBack={() => setIsTrendDialogOpen(false)}
            allLogs={allLogs}
          />
        ) : isPieDialogOpen ? (
          /* 教材別割合 詳細ビュー */
          <PieDetailsView
            onBack={() => setIsPieDialogOpen(false)}
            allLogs={allLogs}
          />
        ) : (
        /* 通常のレポート画面 */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 2 : 3, color: 'text.primary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, '& svg': { fontSize: isMobile ? '24px' : '32px' } }}>
              <BarChartOutlinedIcon />
            </Box>
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 'bold' }}>レポート</Typography>
          </Box>

          <Box sx={{ 
            flexGrow: 1, overflowY: 'auto', overflowX: 'hidden',
            pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2
            }}>
            
          <Box sx={{
              display: 'flex',
              backgroundColor: 'background.paper',
              borderRadius: '20px',
              border: '1px solid', borderColor: 'divider',
              overflow: 'hidden',
              mb: isMobile ? 2 : 3,
              boxShadow: theme.customShadows.sm,
            }}>
              {statItems.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: 1, py: isMobile ? 2 : 2.5, px: 1,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                    borderRight: i < statItems.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  {/* タイトルを上に配置 */}
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: isMobile ? '12px' : '14px', textAlign: 'center', lineHeight: 1.2 }}>
                    {item.label}
                  </Typography>
                  
                  {/* 時間を下に配置し、色は text.primary (元の黒/白) */}
                  <Typography sx={{ fontWeight: '900', fontSize: isMobile ? '18px' : '24px', color: 'text.primary', lineHeight: 1.1 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 学習時間の推移グラフ（詳細画面のテーブル形式を移植） */}
            <Box
              onClick={() => setIsTrendDialogOpen(true)}
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: '20px',
                border: '1px solid', borderColor: 'divider',
                p: isMobile ? 2 : 3,
                mb: isMobile ? 2 : 3,
                boxShadow: theme.customShadows.sm,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: theme.customShadows.md,
                  borderColor: 'primary.light',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                    学習時間の推移
                  </Typography>
                </Box>
              </Box>

              {summaryMaterials.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: 'text.disabled' }}>
                  <BarChartOutlinedIcon sx={{ fontSize: 56, mb: 1 }} />
                  <Typography variant="body2">この期間の記録はありません</Typography>
                </Box>
              ) : (() => {
                const BAR_AREA_H = isMobile ? 180 : 200;
                const ICON_COL_W = isMobile ? 46 : 60;
                const RIGHT_PAD_W = isMobile ? 6 : 16;

                const effectiveH = BAR_AREA_H - 24;
                const tickPositions = summaryYTicks.map(t => ({
                  value: t,
                  bottomPx: summaryBarMax > 0 ? (t / summaryBarMax) * effectiveH : 0,
                }));

                return (
                  <Box sx={{ overflowX: 'hidden' }}>
                    <Table
                      size="small"
                      sx={{
                        borderCollapse: 'separate', borderSpacing: 0,
                        tableLayout: 'fixed',
                        width: '100%',
                        minWidth: isMobile ? '100%' : ICON_COL_W + summaryBarData.length * 60 + RIGHT_PAD_W,
                      }}
                    >
                      <colgroup>
                        <col style={{ width: ICON_COL_W }} />
                        {summaryBarData.map(d => <col key={d.date} />)}
                        <col style={{ width: RIGHT_PAD_W }} />
                      </colgroup>

                      <TableBody>
                        {/* 棒グラフ行 */}
                        <TableRow>
                          <TableCell sx={{ p: 0, border: 'none', verticalAlign: 'bottom' }}>
                            <Box sx={{ height: BAR_AREA_H, position: 'relative', width: '100%' }}>
                              {tickPositions.map(tp => (
                                <Typography key={tp.value} sx={{
                                  position: 'absolute', bottom: tp.bottomPx - 6, right: isMobile ? 4 : 8,
                                  fontSize: isMobile ? '9px' : '10px', color: 'text.secondary',
                                  whiteSpace: 'nowrap', lineHeight: 1,
                                }}>
                                  {formatDurationShort(tp.value)}
                                </Typography>
                              ))}
                            </Box>
                          </TableCell>

                          {/* 各日付の棒グラフセル */}
                          {summaryBarData.map(d => {
                            const total = d.total as number;
                            const barTopPx = summaryBarMax > 0 ? (total / summaryBarMax) * effectiveH : 0;
                            return (
                              <TableCell key={d.date} align="center" sx={{ p: 0, border: 'none', verticalAlign: 'bottom' }}>
                                <Box sx={{
                                  height: BAR_AREA_H, position: 'relative',
                                  display: 'flex', flexDirection: 'column',
                                  justifyContent: 'flex-end', alignItems: 'center',
                                  px: isMobile ? '25%' : '30%',
                                }}>
                                  {tickPositions.map(tp => (
                                    <Box key={tp.value} sx={{
                                      position: 'absolute', left: 0, right: 0, bottom: tp.bottomPx,
                                      height: '1px', backgroundColor: 'divider', opacity: 0.5, zIndex: 0,
                                    }} />
                                  ))}
                                  {total > 0 && (
                                    <Typography sx={{
                                      position: 'absolute', bottom: barTopPx + 4,
                                      fontSize: isMobile ? '9px' : '10px', fontWeight: 'bold',
                                      color: 'text.secondary', lineHeight: 1.2, textAlign: 'center',
                                      whiteSpace: 'nowrap', zIndex: 2,
                                    }}>
                                      {isMobile ? formatDurationShort(total) : formatDuration(total)}
                                    </Typography>
                                  )}
                                  <Box sx={{
                                    width: '100%', display: 'flex', flexDirection: 'column-reverse',
                                    borderRadius: '4px 4px 0 0', overflow: 'hidden', position: 'relative', zIndex: 1,
                                  }}>
                                    {summaryMaterials.map((mat, mi) => {
                                      const val = (d[mat.key] as number) || 0;
                                      if (!val || !summaryBarMax) return null;
                                      const h = Math.max((val / summaryBarMax) * effectiveH, 1);
                                      return (
                                        <Box key={mat.key} sx={{
                                          width: '100%', height: `${h}px`, backgroundColor: mat.color, flexShrink: 0,
                                          borderRadius: mi === summaryMaterials.length - 1 ? '4px 4px 0 0' : 0,
                                        }} />
                                      );
                                    })}
                                  </Box>
                                </Box>
                              </TableCell>
                            );
                          })}
                          <TableCell sx={{ p: 0, border: 'none' }} />
                        </TableRow>

                        {/* 日付ラベル行（これより下の教材内訳はカット） */}
                        <TableRow>
                          <TableCell sx={{ border: 'none', p: 0 }} />
                          {summaryBarData.map(d => (
                            <TableCell key={d.date} align="center" sx={{ border: 'none', pt: 1.5, pb: 0, px: 0 }}>
                              <Typography sx={{ fontWeight: 'bold', fontSize: isMobile ? '10px' : '12px', color: 'text.primary', lineHeight: 1.3 }}>
                                {d.tableLabel}
                              </Typography>
                              <Typography sx={{ fontSize: isMobile ? '9px' : '11px', color: 'text.secondary', lineHeight: 1.2 }}>
                                {getDow(d.date)}
                              </Typography>
                            </TableCell>
                          ))}
                          <TableCell sx={{ border: 'none', p: 0 }} />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Box>
                );
              })()}
            </Box>

            {/* 下部: 円グラフ + ランキング */}
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1.5 : 3, mb: 2 }}>
              {/* 円グラフ */}
              <Box
                onClick={() => setIsPieDialogOpen(true)}
                sx={{
                  flex: 1, minWidth: 0, backgroundColor: 'background.paper', borderRadius: '20px',
                  border: '1px solid', borderColor: 'divider', p: isMobile ? 2 : 3, boxShadow: theme.customShadows.sm,
                  cursor: 'pointer', transition: 'all 0.2s',
                  '&:hover': { boxShadow: theme.customShadows.md, borderColor: 'primary.light' },
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      教材別の割合
                    </Typography>
                  </Box>
                </Box>
                {pieData.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: 'text.disabled' }}>
                    <MenuBookOutlinedIcon sx={{ fontSize: 56, mb: 1 }} />
                    <Typography variant="body2">この期間の記録はありません</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ position: 'relative', width: '100%' }}>
                      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', zIndex: 0 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>合計</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: isMobile ? '16px' : '18px', color: 'text.primary', lineHeight: 1.3 }}>
                          {formatDuration(periodTotalMinutes)}
                        </Typography>
                      </Box>
                      <ResponsiveContainer width="100%" height={200} style={{ position: 'relative', zIndex: 1 }}>
                        <PieChart key={period}>
                          <Pie
                            data={pieDataWithTotal}
                            cx="50%" cy="50%"
                            innerRadius={55} outerRadius={85}
                            paddingAngle={0} dataKey="value"
                            startAngle={90} endAngle={-270}
                            stroke={theme.palette.background.paper}
                            strokeWidth={pieDataWithTotal.length === 1 ? 0 : 0.5}
                          >
                            {pieDataWithTotal.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color}/>
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

              {/* 教材ランキング */}
              <Box sx={{ flex: 1, minWidth: 0, backgroundColor: 'background.paper', borderRadius: '20px', border: '1px solid', borderColor: 'divider', p: isMobile ? 2 : 3, boxShadow: theme.customShadows.sm }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 2 }}>
                  教材ランキング
                </Typography>
                <MaterialRanking pieData={pieData} total={periodTotalMinutes} />
              </Box>
            </Box>

          </Box>
        </>
      )}
    </Box>
  );
}