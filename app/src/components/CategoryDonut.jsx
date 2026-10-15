import React, { memo, useMemo } from 'react';
import PieChart from '../shared/components/reacticx/charts/pie-chart';
import { useTheme } from '../contexts/ThemeContext';
const empty = [];
export default memo(function CategoryDonut({
  slices,
  hidden,
  periodLabel,
  selectedIndex = -1,
  onSelectionChange,
}) {
  const { colors } = useTheme();
  const data = useMemo(
    () =>
      hidden
        ? empty
        : slices.map(slice => ({
            label: slice.key,
            value: slice.total,
            color: slice.color,
          })),
    [hidden, slices],
  );
  return (
    <PieChart.Root
      key={periodLabel}
      data={data}
      trackColor={colors.border}
      animate={!hidden}
      innerRadius={0.66}
      padAngle={1.5}
      activeOffset={10}
      selectedIndex={hidden ? -1 : selectedIndex}
      onSelectionChange={hidden ? undefined : onSelectionChange}
    >
      <PieChart.Slices inactiveOpacity={0.35} />
    </PieChart.Root>
  );
});
