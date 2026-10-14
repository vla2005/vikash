import GlassPanel from './silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fontFamily, fontFamilyBold } from '../theme';
import { formatCurrency } from '../utils/money';
import useReducedMotion from '../hooks/useReducedMotion';

const width = 360;
const height = 158;
const right = 344;
const top = 30;
const bottom = 132;
const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
import { ChartDrawPath, ChartFadeGroup, useChartProgress } from './ChartMotion';

function dateLabel(date) {
  const [, month, day] = date.split('-');
  return `${Number(day)} ${monthNames[Number(month) - 1]}`;
}

function BalanceEvolutionChart({ points, hidden = false }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const reducedMotion = useReducedMotion();
  const chartId = `balance${useId().replace(/:/g, '')}`;
  const progress = useChartProgress(!!points?.length && !hidden && !reducedMotion, points, 'inOutQuad');
  if (!points?.length) { return null; }
  const values = points.map(point => point.balance);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const rawStep = Math.max(maximum - minimum, 1) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].find(value => value * magnitude >= rawStep) * magnitude;
  const lower = Math.floor(minimum / step) * step;
  const upper = Math.max(lower + step, Math.ceil(maximum / step) * step);
  const ticks = Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, index) => lower + index * step);
  const tickLabels = ticks.map(value => value.toLocaleString('pt-BR', { maximumFractionDigits: step < 1 ? 2 : 0 }));
  const left = Math.max(38, ...tickLabels.map(label => label.length * 6 + 11));
  const y = value => bottom - (value - lower) / (upper - lower) * (bottom - top);
  const plotted = points.map((point, index) => ({ ...point, x: left + index / Math.max(points.length - 1, 1) * (right - left), y: y(point.balance) }));
  const line = plotted.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const lineLength = Math.max(1, plotted.slice(1).reduce((length, point, index) => {
    const previous = plotted[index];
    return length + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0));
  const last = plotted[plotted.length - 1];
  const currentBalance = formatCurrency(last.balance);
  const tooltipWidth = Math.max(83, currentBalance.length * 6 + 14);
  const tooltipY = Math.max(1, last.y - 39);

  return <GlassPanel style={s.card}>
    <Text accessibilityRole="header" style={s.title}>Evolução do saldo</Text>
    <Text style={s.subtitle}>Últimos 7 dias</Text>
    {hidden ? <View style={s.hidden}><Text style={s.hiddenText}>••••••</Text><Text style={s.subtitle}>Mostre os valores para ver o gráfico.</Text></View>
      : <View accessible accessibilityRole="image" accessibilityLabel={`Evolução do saldo nos últimos 7 dias. ${points.map(point => `${dateLabel(point.date)}: ${formatCurrency(point.balance)}`).join('. ')}. Hoje: ${currentBalance}`}>
        <Svg width="100%" viewBox={`0 0 ${width} ${height}`} style={s.chart}>
          <Defs>
            <LinearGradient id={`${chartId}Area`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.primary} stopOpacity={0.16} /><Stop offset="1" stopColor={colors.primary} stopOpacity={0.02} /></LinearGradient>
          </Defs>
          {ticks.map((value, index) => <React.Fragment key={value}>
            <Line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke={colors.border} strokeWidth={0.8} strokeDasharray="2 3" />
            <SvgText x={left - 11} y={y(value) + 3} fontFamily={fontFamily} fontSize={10} fill={colors.secondary} textAnchor="end">{tickLabels[index]}</SvgText>
          </React.Fragment>)}
          {[0, 2, 4, 6].filter(index => index < plotted.length).map(index => <React.Fragment key={index}>
            <Line x1={plotted[index].x} x2={plotted[index].x} y1={top} y2={bottom} stroke={colors.border} strokeWidth={0.7} strokeDasharray="2 3" />
            <SvgText x={plotted[index].x} y={bottom + 18} fontFamily={fontFamily} fontSize={9} fill={colors.secondary} textAnchor="middle">{dateLabel(plotted[index].date)}</SvgText>
          </React.Fragment>)}
          {/* Animar o traço evita o recorte em Defs que pode permanecer vazio no Android. */}
          <ChartFadeGroup progress={progress}>
          <Path d={`${line} L ${last.x} ${bottom} L ${left} ${bottom} Z`} fill={`url(#${chartId}Area)`} />
          {plotted.map((point, index) => <Circle key={point.date} cx={point.x} cy={point.y} r={index === plotted.length - 1 ? 5.5 : 2.8} fill={colors.primary} />)}
          </ChartFadeGroup>
          <ChartDrawPath progress={progress} length={lineLength} d={line} stroke={colors.primary} strokeWidth={2.8} fill="none" strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={[lineLength, lineLength]}
            />
          <ChartFadeGroup progress={progress} late>
          <Line x1={last.x} x2={last.x} y1={tooltipY + 23} y2={bottom} stroke={colors.primary} strokeOpacity={0.45} strokeWidth={0.9} strokeDasharray="4 4" />
          <Rect x={right - tooltipWidth + 8} y={tooltipY} width={tooltipWidth} height={21} rx={4} fill={colors.primary} />
          <Polygon points={`${last.x - 4},${tooltipY + 21} ${last.x + 4},${tooltipY + 21} ${last.x},${tooltipY + 26}`} fill={colors.primary} />
          <SvgText x={right - tooltipWidth / 2 + 8} y={tooltipY + 14} fill={colors.onPrimary} fontFamily={fontFamilyBold} fontSize={10} fontWeight="700" textAnchor="middle">{currentBalance}</SvgText>
          </ChartFadeGroup>
        </Svg>
      </View>}
  </GlassPanel>;
}

const createStyles = (colors) => StyleSheet.create({
  card: { marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: colors.surface },
  title: { fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 18, lineHeight: 26, color: colors.text },
  subtitle: { fontFamily, fontSize: 13, lineHeight: 20, color: colors.secondary },
  chart: { aspectRatio: width / height, marginTop: 5 },
  hidden: { minHeight: 158, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hiddenText: { fontFamily: fontFamilyBold, fontSize: 24, letterSpacing: 3, color: colors.secondary },
});

export default React.memo(BalanceEvolutionChart);
