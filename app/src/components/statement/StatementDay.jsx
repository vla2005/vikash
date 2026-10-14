import React, { memo, useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTheme, useThemeStyles } from '../../contexts/ThemeContext';
import SwipeableRow from '../SwipeableRow';
import CategoryIcon from '../CategoryIcon';
import GlassPanel from '../silver/GlassPanel';
import { formatCurrency } from '../../utils/money';
import createStyles from './statementStyles';

export const StatementTransactionRow = memo(function StatementTransactionRow({
  row,
  separator,
  open,
  onOpenChange,
  onDelete,
  onOpenTransaction,
}) {
  const { categoryColors } = useTheme();
  const s = useThemeStyles(createStyles);
  const palette =
    categoryColors.find(color => color.key === row.color) ||
    categoryColors.find(color => color.key === 'gray');
  const changeOpen = useCallback(
    value => onOpenChange(row.id, value),
    [onOpenChange, row.id],
  );
  const requestDelete = useCallback(() => onDelete(row), [onDelete, row]);
  const openDetails = useCallback(
    () => onOpenTransaction?.(row),
    [onOpenTransaction, row],
  );
  const rowStyle = useMemo(
    () => [s.row, separator && s.separator],
    [s, separator],
  );
  const tileStyle = useMemo(
    () => [s.tile, { backgroundColor: palette.accent }],
    [s, palette.accent],
  );
  return (
    <SwipeableRow
      label={`Abrir lançamento ${row.description}`}
      actionLabel={`Excluir ${row.purchaseUuid ? 'compra' : 'transação'} ${
        row.description
      }`}
      open={open}
      onOpenChange={changeOpen}
      onAction={requestDelete}
      onPress={openDetails}
      style={rowStyle}
    >
      <View style={tileStyle}>
        <CategoryIcon
          name={row.icon || 'wallet'}
          color={palette.onAccent}
          size={23}
        />
      </View>
      <View style={s.info}>
        <Text numberOfLines={2} style={s.description}>
          {row.description}
        </Text>
        <Text numberOfLines={2} style={s.detail}>
          {[
            row.type === 'INVOICE_PAYMENT'
              ? 'Pagamento de fatura'
              : row.category || 'Sem categoria',
            row.account,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <View style={s.amountColumn}>
        <Text style={[s.amount, row.type === 'INCOME' && s.green]}>
          {row.type === 'INCOME'
            ? '+ '
            : ['EXPENSE', 'INVOICE_PAYMENT'].includes(row.type)
            ? '− '
            : ''}
          {formatCurrency(row.amount)}
        </Text>
        <Text style={s.detail}>
          {row.payment}
          {row.installmentCount > 1
            ? ' · ' + row.installmentNumber + '/' + row.installmentCount
            : ''}
        </Text>
      </View>
    </SwipeableRow>
  );
});

// A unidade virtualizada é o dia: o material contínuo do card permanece intacto.
export default memo(function StatementDay({
  group,
  openRow,
  onOpenChange,
  onDelete,
  onOpenTransaction,
}) {
  const s = useThemeStyles(createStyles);
  return (
    <View>
      <Text style={s.day}>{group.label}</Text>
      <GlassPanel style={s.list}>
        {group.rows.map((row, index) => (
          <StatementTransactionRow
            key={row.id}
            row={row}
            separator={index > 0}
            open={openRow === row.id}
            onOpenChange={onOpenChange}
            onDelete={onDelete}
            onOpenTransaction={onOpenTransaction}
          />
        ))}
      </GlassPanel>
    </View>
  );
});
