// src/components/PieDetailsView.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, IconButton,
  LinearProgress, Chip,
  useTheme, useMediaQuery, alpha,
} from '@mui/material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  type LogEntry,
  formatDuration,
  toLocalDate,
  buildPieData,
} from '../lib/reportUtils';

// ==========================================
// カスタム Pie Tooltip（Report.tsx でも使用するためエクスポート）
// ==========================================
export const CustomPieTooltip = ({ active, payload }: any) => {
  const theme = useTheme();
  if (!active || !payload || payload.length === 0) return null;
  const { name, value, color } = payload[0].payload;
  const total = payload[0].payload.__total ?? value;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{
      backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider',
      borderRadius: '12px', px: 2, py: 1.5,
      boxShadow: theme.customShadows.md, maxWidth: '200px', zIndex: 10,
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
// 教材別割合 詳細ビュー
// ==========================================
type PieDetailTab = '1d' | '7d' | '30d';
const PIE_TAB_LABELS: Record<PieDetailTab, string> = { '1d': '日', '7d': '週', '30d': '月' };

interface PieDetailsViewProps {
  onBack: () => void;
  allLogs: LogEntry[];
}

export default function PieDetailsView({ onBack, allLogs }: PieDetailsViewProps) {
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
            border: '1px solid', borderColor: 'divider', p: isMobile ? 2 : 3, mb: 2,
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
                  borderBottom: isLast ? 'none' : '1px solid', borderColor: 'divider',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography sx={{ width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: '13px', color: i < 3 ? item.color : 'text.disabled', flexShrink: 0 }}>
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
                    <Chip label={`${pct}%`} size="small" sx={{ height: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: alpha(item.color, 0.12), color: item.color, flexShrink: 0 }} />
                  </Box>
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
