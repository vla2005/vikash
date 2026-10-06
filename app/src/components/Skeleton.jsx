import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// Static placeholders keep content in place while the API responds.
export default function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  return <View accessible={false} importantForAccessibility="no" style={[s.block, { width, height, borderRadius: radius }, style]} />;
}

export function SkeletonGroup({ label, children, style }) {
  return <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} pointerEvents="none" style={style}>{children}</View>;
}

export function ListSkeleton({ label = 'Carregando lançamentos', count = 4, showAmount = true }) {
  return <SkeletonGroup label={label} style={s.list}>
    {Array.from({ length: count }, (_, index) => <View key={index} style={[s.row, index > 0 && s.separator]}>
      <Skeleton width={42} height={42} radius={13} />
      <View style={s.copy}><Skeleton width={index % 2 ? '60%' : '78%'} height={15} /><Skeleton width="50%" height={11} /></View>
      {showAmount && <Skeleton width={72} height={17} />}
    </View>)}
  </SkeletonGroup>;
}

export function CreditCardSkeleton({ label = 'Carregando cartões' }) {
  return <SkeletonGroup label={label} style={s.card}>
    <View style={s.identity}><Skeleton width={43} height={43} radius={13} /><View style={s.copy}><Skeleton width="75%" height={18} /><Skeleton width="50%" height={12} /></View></View>
    <Skeleton height={6} radius={3} />
    <View style={s.metrics}><View style={s.copy}><Skeleton width="65%" height={12} /><Skeleton width="85%" height={25} /></View><View style={s.copy}><Skeleton width="70%" height={12} /><Skeleton width="90%" height={25} /></View></View>
    <View style={s.metrics}><Skeleton width="55%" height={12} /><Skeleton width="25%" height={14} /></View>
  </SkeletonGroup>;
}

export function DetailsSkeleton({ label = 'Carregando detalhes', card = false }) {
  return <SkeletonGroup label={label} style={s.details}>
    <View style={s.identity}><Skeleton width={54} height={54} radius={17} /><View style={s.copy}><Skeleton width="78%" height={23} /><Skeleton width="55%" height={14} /></View></View>
    <View style={s.panel}><Skeleton width="35%" height={12} /><Skeleton width="70%" height={42} />
      <View style={s.separator}><Skeleton width="80%" height={16} /></View><Skeleton width="65%" height={16} />
    </View>
    {card && <View style={s.metrics}>{[0, 1, 2].map(index => <Skeleton key={index} width="30%" height={65} radius={15} />)}</View>}
    <Skeleton width="55%" height={21} />
    <ListSkeleton count={3} label={card ? 'Carregando compras da fatura' : 'Carregando informações'} />
  </SkeletonGroup>;
}

export function DashboardSkeleton() {
  return <SkeletonGroup label="Carregando resumo" style={s.dashboard}>
    <View style={s.metrics}>{[0, 1].map(index => <View key={index} style={s.comparison}><Skeleton width="85%" height={15} /><Skeleton width="65%" height={11} /></View>)}</View>
    <View style={s.panel}><Skeleton width="55%" height={18} /><Skeleton width="30%" height={11} /><Skeleton height={140} radius={12} /></View>
    <View style={s.panel}><Skeleton width="65%" height={18} /><View style={s.center}><Skeleton width={160} height={160} radius={80} /></View><ListSkeleton count={3} label="Carregando gastos por categoria" /></View>
    <View style={s.panel}><Skeleton width="70%" height={21} /><ListSkeleton count={2} label="Carregando contas" /><CreditCardSkeleton /></View>
    <View style={s.panel}><Skeleton width="65%" height={18} /><ListSkeleton count={3} label="Carregando movimentações recentes" /></View>
  </SkeletonGroup>;
}

export function AppSkeleton() {
  return <View style={s.app}><SkeletonGroup label="Carregando aplicativo" style={s.appHeader}><Skeleton width={126} height={36} /><Skeleton width={40} height={40} radius={20} /></SkeletonGroup><Skeleton width="45%" height={23} /><Skeleton width="75%" height={42} /><DashboardSkeleton /></View>;
}

const s = StyleSheet.create({
  block: { backgroundColor: colors.border },
  list: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingVertical: 14 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 14 },
  copy: { flex: 1, minWidth: 0, gap: 9 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 14, gap: 20 },
  metrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  details: { gap: 22, marginTop: 18 },
  panel: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, gap: 16 },
  dashboard: { marginTop: 12, gap: 18 },
  comparison: { flex: 1, borderRadius: 18, backgroundColor: colors.surface, padding: 14, gap: 10 },
  center: { alignItems: 'center', paddingVertical: 12 },
  app: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 60, gap: 20, overflow: 'hidden' },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
