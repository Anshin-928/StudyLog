// src/components/TrendDetailsView.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, IconButton,
  Table, TableBody, TableCell, TableRow,
  useTheme, useMediaQuery, alpha,
} from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  type LogEntry,
  type TrendViewMode,
  formatDuration, formatDurationShort,
  toLocalDate, shortDate, shortMonth,
  getDow, getWeekSunday,
  getTrendPeriodInfo, formatTrendPeriodRange,
} from '../lib/reportUtils';

interface TrendDetailsViewProps {
  onBack: () => void;
  allLogs: LogEntry[];
}

export default function TrendDetailsView({ onBack, allLogs }: TrendDetailsViewProps) {
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
    const targetLogs = allLogs.filter(l => {
      const logDate = toLocalDate(l.studyDatetime);
      if (viewMode === 'month') {
        return logDate.slice(0, 7) >= startDate && logDate.slice(0, 7) <= endDate;
      }
      return logDate >= startDate && logDate <= endDateFull;
    });

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
      pb: isMobile ? 'calc(56px + env(safe-area-inset-bottom) + 24px)' : 2,
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

      {/* 棒グラフ＋教材別内訳 統合テーブル */}
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
        const effectiveH = BAR_AREA_H - 24;
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
                borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', width: '100%',
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
                  <TableCell sx={{ p: 0, border: 'none', verticalAlign: 'bottom' }}>
                    <Box sx={{ height: BAR_AREA_H, position: 'relative', width: '100%' }}>
                      {tickPositions.map(tp => (
                        <Typography key={tp.value} sx={{
                          position: 'absolute', bottom: tp.bottomPx - 6,
                          right: isMobile ? 4 : 8,
                          fontSize: isMobile ? '9px' : '10px', color: 'text.secondary',
                          whiteSpace: 'nowrap', lineHeight: 1,
                        }}>
                          {formatDurationShort(tp.value)}
                        </Typography>
                      ))}
                    </Box>
                  </TableCell>

                  {barData.map(d => {
                    const total = d.total as number;
                    const barTopPx = barMax > 0 ? (total / barMax) * effectiveH : 0;
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
                              color: 'text.secondary', lineHeight: 1.2,
                              textAlign: 'center', whiteSpace: 'nowrap', zIndex: 2,
                            }}>
                              {isMobile ? formatDurationShort(total) : formatDuration(total)}
                            </Typography>
                          )}
                          <Box sx={{
                            width: '100%', display: 'flex', flexDirection: 'column-reverse',
                            borderRadius: '4px 4px 0 0', overflow: 'hidden', position: 'relative', zIndex: 1,
                          }}>
                            {materials.map((mat, mi) => {
                              const val = (d[mat.key] as number) || 0;
                              if (!val || !barMax) return null;
                              const h = Math.max((val / barMax) * effectiveH, 1);
                              return (
                                <Box key={mat.key} sx={{
                                  width: '100%', height: `${h}px`, backgroundColor: mat.color, flexShrink: 0,
                                  borderRadius: mi === materials.length - 1 ? '4px 4px 0 0' : 0,
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

                {/* 日付ラベル行 */}
                <TableRow>
                  <TableCell sx={{ border: 'none', p: 0 }} />
                  {barData.map(d => (
                    <TableCell key={d.date} align="center" sx={{ border: 'none', pt: 1.5, pb: 1.5, px: 0 }}>
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
                  <TableCell colSpan={barData.length + 2} sx={{ p: 0, border: 'none', borderTop: '1px solid', borderColor: 'divider' }} />
                </TableRow>

                {/* 教材ごとに 2行 */}
                {materials.map((mat, matIdx) => {
                  const isLast = matIdx === materials.length - 1;
                  return (
                    <React.Fragment key={mat.key}>
                      <TableRow>
                        <TableCell
                          rowSpan={2}
                          sx={{
                            backgroundColor: 'background.paper', border: 'none',
                            borderBottom: isLast ? 'none' : '1px solid', borderBottomColor: 'divider',
                            verticalAlign: 'middle', p: isMobile ? '8px 2px 8px 6px' : '8px 10px',
                          }}
                        >
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            <Box sx={{
                              position: 'absolute', left: isMobile ? -6 : -10, top: '50%', transform: 'translateY(-50%)',
                              width: 3, height: 36, backgroundColor: mat.color, borderRadius: '0 2px 2px 0',
                            }} />
                            {mat.image ? (
                              <Box component="img" src={mat.image} sx={{
                                width: isMobile ? 24 : 30, height: isMobile ? 34 : 42, objectFit: 'cover',
                                borderRadius: '4px', border: '1px solid', borderColor: 'divider',
                              }} />
                            ) : (
                              <Box sx={{
                                width: isMobile ? 24 : 30, height: isMobile ? 34 : 42,
                                backgroundColor: alpha(mat.color, 0.1), borderRadius: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid', borderColor: 'divider',
                              }}>
                                <MenuBookOutlinedIcon sx={{ fontSize: '14px', color: mat.color }} />
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell colSpan={barData.length + 1} sx={{ border: 'none', pt: 1.5, pb: 0.25, px: 0.5 }}>
                          <Typography sx={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 'bold', color: 'text.primary', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mat.name}
                          </Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        {barData.map(d => {
                          const val = (d[mat.key] as number) || 0;
                          return (
                            <TableCell key={d.date} align="center" sx={{
                              border: 'none', borderBottom: isLast ? 'none' : '1px solid', borderBottomColor: 'divider',
                              color: val ? 'text.primary' : 'text.disabled', fontWeight: val ? 'bold' : 'normal',
                              fontSize: isMobile ? '10px' : '12px', whiteSpace: 'nowrap',
                              pt: 0.25, pb: 1.5, px: 0,
                            }}>
                              {val === 0 ? '0分' : (isMobile ? formatDurationShort(val) : formatDuration(val))}
                            </TableCell>
                          );
                        })}
                        <TableCell sx={{ border: 'none', borderBottom: isLast ? 'none' : '1px solid', borderBottomColor: 'divider' }} />
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
