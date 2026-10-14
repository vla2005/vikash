import React, { memo, useMemo } from 'react';
import PieChart from '../shared/components/reacticx/charts/pie-chart';
import { useTheme } from '../contexts/ThemeContext';
const empty = [];
export default memo(function CategoryDonut({ slices, hidden, periodLabel }) {
  const { colors } = useTheme();
  const data = useMemo(() => hidden ? empty : slices.map(slice => ({ label: slice.key, value: slice.total, color: slice.color })), [hidden, slices]);
  return <PieChart.Root key={periodLabel} data={data} trackColor={colors.border} animate={!hidden} innerRadius={65 / 87}><PieChart.Slices /></PieChart.Root>;
});
