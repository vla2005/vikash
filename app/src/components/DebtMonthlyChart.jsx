import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import BarChart from '../shared/components/reacticx/charts/bar-chart';
import { invoiceMonthLabel } from '../utils/initialInvoices';
import { fontFamily } from '../theme';

export default memo(function DebtMonthlyChart({ months, monthKeys, maxY }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const data = useMemo(() => monthKeys.map(month => ({
    label: `${invoiceMonthLabel(month).slice(0, 3)}/${month.slice(2, 4)}`,
    value: (months[month] || 0) / 100,
  })), [monthKeys, months]);

  return (
    <View testID="debt-monthly-chart" aria-hidden importantForAccessibility="no-hide-descendants" style={s.frame}>
      <BarChart.Root data={data} maxY={maxY} animate={false} enablePan={false}
        style={s.chart} leftInset={0} bottomInset={26} topInset={8} tickCount={3}>
        <BarChart.Grid color={colors.border} />
        <BarChart.Bars color={colors.primary} radius={5} />
        <BarChart.XAxis style={s.axis} />
      </BarChart.Root>
    </View>
  );
});

const createStyles = colors => StyleSheet.create({
  frame: { marginHorizontal: -6 },
  chart: { height: 124, width: '100%' },
  axis: { color: colors.secondary, fontFamily, fontSize: 10 },
});
