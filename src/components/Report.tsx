// src/components/Report.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, CircularProgress,
  LinearProgress, Chip,
  useMediaQuery, useTheme, alpha,
  Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import {
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '../lib/supabase';
import {
  type Period, type LogEntry, type PieItem,
  formatDuration, formatDurationHoursOnly, formatDurationShort,
  todayStr, toLocalDate, shortDate,
  thisMonthStart, getPeriodStart,
  getDow, getTrendPeriodInfo,
  buildPieData,
} from '../lib/reportUtils';
import TrendDetailsView from './TrendDetailsView';
import PieDetailsView, { CustomPieTooltip } from './PieDetailsView';

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
// メインコンポーネント
// ==========================================
export default function Report() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const period: Period = '7d';
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

  // allLogs を 1回のループで periodLogs・今日/今月/総計を同時集計
  const { todayMinutes, thisMonthMinutes, grandTotalMinutes, periodLogs } = useMemo(() => {
    const today = todayStr();
    const monthStart = thisMonthStart();
    const periodStart = getPeriodStart(period);

    let todayMinutes = 0;
    let thisMonthMinutes = 0;
    let grandTotalMinutes = 0;
    const periodLogs: LogEntry[] = [];

    for (const l of allLogs) {
      const mins = l.durationMinutes ?? 0;
      const d = toLocalDate(l.studyDatetime);
      grandTotalMinutes += mins;
      if (d >= monthStart) thisMonthMinutes += mins;
      if (d === today) todayMinutes += mins;
      if (d >= periodStart) periodLogs.push(l);
    }

    return { todayMinutes, thisMonthMinutes, grandTotalMinutes, periodLogs };
  }, [allLogs, period]);

  // periodLogs から pieData・合計・pieDataWithTotal を一括生成
  const { pieData, periodTotalMinutes, pieDataWithTotal } = useMemo(() => {
    let periodTotalMinutes = 0;
    for (const l of periodLogs) periodTotalMinutes += l.durationMinutes ?? 0;
    const pieData = buildPieData(periodLogs, theme.palette.chart);
    const pieDataWithTotal = pieData.map(d => ({ ...d, __total: periodTotalMinutes }));
    return { pieData, periodTotalMinutes, pieDataWithTotal };
  }, [periodLogs, theme.palette.chart]);

  const currentMonth = new Date().getMonth() + 1;

  const { dates: summaryDates } = useMemo(() => getTrendPeriodInfo('day', 0), []);

  // summaryBarData: 事前に日付別グルーピング (O(n)) で O(n²) → O(n) へ改善
  const { summaryBarData, summaryMaterials, summaryBarMax, summaryYTicks } = useMemo(() => {
    const summaryDatesSet = new Set(summaryDates);

    // 1回のループで日付別にログをグルーピング
    const logsByDate = new Map<string, LogEntry[]>();
    for (const l of allLogs) {
      const d = toLocalDate(l.studyDatetime);
      if (!summaryDatesSet.has(d)) continue;
      if (!logsByDate.has(d)) logsByDate.set(d, []);
      logsByDate.get(d)!.push(l);
    }

    // matMap と barData を同時構築（日付ごとに1回ずつアクセス）
    const matMap = new Map<string, { name: string; total: number; image: string | null }>();
    const barData = summaryDates.map(dateStr => {
      const item: Record<string, any> = { tableLabel: shortDate(dateStr), date: dateStr, total: 0 };
      for (const l of logsByDate.get(dateStr) ?? []) {
        if ((l.durationMinutes ?? 0) <= 0) continue;
        const key = l.materialId ?? '__none__';
        const mins = l.durationMinutes!;
        item[key] = (item[key] || 0) + mins;
        item.total += mins;
        if (!matMap.has(key)) matMap.set(key, { name: l.materialName ?? '教材なし', total: 0, image: l.materialImage });
        matMap.get(key)!.total += mins;
      }
      return item;
    });

    const materials = Array.from(matMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.total - a.total)
      .map((m, i) => ({ ...m, color: theme.palette.chart[i % theme.palette.chart.length] }));

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