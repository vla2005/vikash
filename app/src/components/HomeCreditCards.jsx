import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import { formatInvoiceDate } from './CreditCardInvoiceDrawer';
import useReducedMotion from '../hooks/useReducedMotion';
import { formatCurrency } from '../utils/money';
import { colors, fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

const statusLabels = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Paga' };
const reveal = 46;

function cardColor(card) {
  const bank = (card.financialInstitution?.name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (bank.includes('bradesco') || bank.includes('santander')) { return '#991C42'; }
  if (bank === 'inter' || bank.includes('banco inter')) { return '#C94B08'; }
  if (bank.includes('nubank')) { return '#6B23AD'; }
  if (bank.includes('c6') || bank.includes('btg')) { return '#243044'; }
  return colors.primary;
}

function orderedCards(cards, selectedUuid) {
  return [...cards].sort((a, b) => Number(b.uuid === selectedUuid) - Number(a.uuid === selectedUuid));
}

export default function HomeCreditCards({ cards, profile, onOpenCard, onViewCards, title = 'Meus cartões', compactHeading = false }) {
  const [selectedUuid, setSelectedUuid] = useState(cards[0]?.uuid);
  const [transition, setTransition] = useState(null);
  const [width, setWidth] = useState(320);
  const progress = useRef(new Animated.Value(0)).current;
  const switching = useRef(false);
  const animation = useRef(null);
  const reducedMotion = useReducedMotion();
  const selected = cards.find(card => card.uuid === selectedUuid) ?? cards[0];
  const selectedId = selected?.uuid;
  const cardHeight = width / 1.586;
  const rearCount = Math.min(2, Math.max(0, cards.length - 1));
  const frontY = rearCount * reveal;
  const currentOrder = orderedCards(cards, selectedId);
  const nextOrder = orderedCards(cards, transition ?? selectedId);

  useEffect(() => {
    // A refreshed dashboard can remove a card or replace the entire list.
    animation.current?.stop();
    switching.current = false;
    setTransition(null);
    setSelectedUuid(uuid => cards.some(card => card.uuid === uuid) ? uuid : cards[0]?.uuid);
    return () => animation.current?.stop();
  }, [cards]);

  function chooseCard(uuid) {
    if (switching.current || uuid === selectedId) { return; }
    switching.current = true;
    progress.setValue(0);
    setTransition(uuid);
    animation.current = Animated.timing(progress, {
      toValue: 1, duration: reducedMotion ? 180 : 680, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      if (!finished) { return; }
      setSelectedUuid(uuid);
      setTransition(null);
      switching.current = false;
    });
  }

  const invoice = selected?.currentInvoice;
  const usedLimit = selected ? Math.max(0, selected.creditLimit - selected.availableLimit) : 0;
  const usedPercentage = selected?.creditLimit > 0 ? usedLimit / selected.creditLimit * 100 : 0;
  const visibleIds = new Set([...currentOrder.slice(0, 3), ...nextOrder.slice(0, 3)].map(card => card.uuid));

  return <View style={s.section}>
    <View style={s.heading}>
      <Text accessibilityRole="header" style={[s.title, compactHeading && s.compactTitle]}>{title}</Text>
      {!!onViewCards && <Pressable accessibilityRole="button" accessibilityLabel="Ver todos os cartões" onPress={onViewCards} style={({ pressed }) => [s.all, pressed && s.pressed]}>
        <Text style={s.link}>Ver todos</Text><Icon name="chevron" size={16} color={colors.primary} />
      </Pressable>}
    </View>
    {!selected ? <View style={s.empty}>
      <Icon name="creditCard" size={28} color={colors.primary} />
      <View style={s.emptyCopy}><Text style={s.emptyTitle}>Seus cartões, em um só lugar</Text><Text style={s.caption}>Adicione um cartão para acompanhar suas faturas e limites.</Text></View>
    </View> : <>
      <View onLayout={event => { const measured = event.nativeEvent.layout.width; if (measured > 0) { setWidth(measured); } }}
        style={[s.stack, { height: cardHeight + frontY }]}>
        {cards.filter(card => visibleIds.has(card.uuid)).map(card => {
          const oldRank = currentOrder.findIndex(item => item.uuid === card.uuid);
          const newRank = nextOrder.findIndex(item => item.uuid === card.uuid);
          const incoming = transition === card.uuid;
          const oldY = frontY - Math.min(oldRank, 3) * reveal;
          const newY = frontY - Math.min(newRank, 3) * reveal;
          const oldScale = 1 - Math.min(oldRank, 3) * 0.045;
          const newScale = 1 - Math.min(newRank, 3) * 0.045;
          const moving = !!transition;
          const transform = moving && !reducedMotion ? [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [oldY, newY] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [oldScale, newScale] }) },
          ] : [{ translateY: moving ? newY : oldY }, { scale: moving ? newScale : oldScale }];
          const opacity = moving && incoming ? progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] })
            : moving && newRank >= 3 ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1;
          const animatedStyle = { height: cardHeight, zIndex: incoming ? 10 : 4 - oldRank, transform, opacity };
          return <Animated.View key={card.uuid} style={[s.cardPosition, animatedStyle]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar cartão ${card.description}`}
              accessibilityState={{ selected: card.uuid === selectedId, disabled: !!transition }} disabled={!!transition}
              onPress={() => chooseCard(card.uuid)} style={[s.card, { backgroundColor: cardColor(card) }]}>
              <Svg width="100%" height="100%" viewBox="0 0 320 202" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={false}>
                <Path d="M-20 180C50 180 72 54 142 96S220 172 340 32V230H-20Z" fill="#FFFFFF" opacity="0.045" />
                <Path d="M-20 234C86 168 142 204 202 118S286 70 350 136V230Z" fill="#051747" opacity="0.16" />
              </Svg>
              <View style={s.bankRow}><InstitutionLogo institution={card.financialInstitution} size={26} /><Text numberOfLines={1} style={s.bankName}>{card.financialInstitution?.name ?? 'Cartão de crédito'}</Text><Contactless /></View>
              <Text numberOfLines={2} style={s.cardName}>{card.description}</Text>
              <View style={s.cardFooter}><Text numberOfLines={1} style={s.holder}>{profile?.name ?? ''}</Text><Text style={s.credit}>Crédito</Text></View>
            </Pressable>
          </Animated.View>;
        })}
      </View>
      {cards.length > 1 && <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dots}>
          {cards.map(card => <Pressable key={card.uuid} accessibilityRole="button" accessibilityLabel={`Mostrar cartão ${card.description}`}
            accessibilityState={{ selected: card.uuid === selectedId, disabled: !!transition }} disabled={!!transition} onPress={() => chooseCard(card.uuid)} style={s.dotButton}>
            <View style={[s.dot, card.uuid === (transition ?? selectedId) && s.selectedDot]} />
          </Pressable>)}
        </ScrollView>
        <Text style={s.hint}>Toque em um cartão para selecionar</Text>
      </>}
      <View accessibilityLiveRegion="polite" style={[s.details, cards.length === 1 && s.singleDetails]}>
        <View style={s.detailsHeading}><Text numberOfLines={2} style={s.detailsName}>{selected.description}</Text>
          {!!invoice?.status && <Text style={[s.badge, invoice.status === 'CLOSED' && s.closedBadge, invoice.status === 'PAID' && s.paidBadge]}>{statusLabels[invoice.status] ?? invoice.status}</Text>}
        </View>
        <View style={s.metrics}>
          <View style={s.metric}><Text style={s.label}>Fatura atual</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, width < 340 && s.compactValue]}>{formatCurrency(invoice?.total ?? 0)}</Text></View>
          <View style={[s.metric, s.divider]}><Text style={s.label}>Limite disponível</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, width < 340 && s.compactValue, selected.availableLimit < 0 && s.negative]}>{formatCurrency(selected.availableLimit)}</Text></View>
        </View>
        <View style={s.usage}><View accessibilityRole="progressbar" accessibilityLabel={`Limite utilizado de ${selected.description}`} accessibilityValue={{ min: 0, max: 100, now: Math.min(100, Math.round(usedPercentage)) }} style={s.track}>
          <View style={[s.progress, { width: `${Math.min(100, usedPercentage)}%` }, selected.availableLimit < 0 && s.overLimit]} />
        </View><Text style={s.usageLabel}>{`${Math.round(usedPercentage)}% utilizado`}</Text></View>
        <View style={s.invoiceFooter}><View style={s.due}><Text style={s.caption}>{invoice ? `Vencimento em ${formatInvoiceDate(invoice.dueDate)}` : 'Nenhuma fatura em aberto'}</Text></View>
          {!!onOpenCard && <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${invoice ? 'fatura' : 'detalhes'} de ${selected.description}`} disabled={!!transition} onPress={() => onOpenCard(selected.uuid, invoice?.uuid)} style={({ pressed }) => [s.invoiceButton, pressed && s.pressed]}>
            <Text style={s.link}>{invoice ? 'Ver fatura' : 'Ver cartão'}</Text><Icon name="chevron" size={16} color={colors.primary} />
          </Pressable>}
        </View>
      </View>
    </>}
  </View>;
}

function Contactless() {
  return <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
    <Path d="M5 9a5 5 0 010 6M9 6a10 10 0 010 12M13 3a15 15 0 010 18M17 1a19 19 0 010 22" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>;
}

const s = StyleSheet.create({
  section: { marginTop: 24 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontFamily: fontFamilyBold, fontWeight: '700', color: colors.text, fontSize: 22, letterSpacing: -0.7 },
  compactTitle: { fontSize: 17, letterSpacing: -0.3 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44 }, link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 12, fontWeight: '600' },
  stack: { position: 'relative', marginTop: 6, overflow: 'visible' }, cardPosition: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: { flex: 1, borderRadius: 20, padding: 14, overflow: 'hidden', justifyContent: 'space-between', boxShadow: '0px 6px 14px rgba(21,36,74,0.16)' },
  bankRow: { flexDirection: 'row', gap: 9, alignItems: 'center' }, bankName: { flex: 1, fontFamily: fontFamilyMedium, color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  cardName: { fontFamily: fontFamilyBold, fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.7, color: '#FFFFFF', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 }, holder: { flex: 1, fontFamily: fontFamilyMedium, fontSize: 12, color: '#FFFFFF' }, credit: { fontFamily, fontSize: 11, color: '#FFFFFF' },
  dots: { flexGrow: 1, justifyContent: 'center', paddingTop: 3 }, dotButton: { width: 30, height: 36, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CCD5E4' }, selectedDot: { width: 18, backgroundColor: colors.primary }, hint: { fontFamily, color: colors.secondary, fontSize: 11, textAlign: 'center', marginBottom: 14 },
  details: { backgroundColor: colors.surface, borderRadius: 22, padding: 16 }, singleDetails: { marginTop: 16 }, detailsHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailsName: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 16, color: colors.text, lineHeight: 23 },
  badge: { fontFamily: fontFamilyMedium, fontSize: 10, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  closedBadge: { color: '#815321', backgroundColor: '#FFF0D9' }, paidBadge: { color: colors.positive, backgroundColor: '#E6F5EE' },
  metrics: { flexDirection: 'row', marginTop: 16, marginBottom: 14 }, metric: { flex: 1, minWidth: 0, gap: 4 }, divider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  label: { fontFamily, color: colors.secondary, fontSize: 11 }, value: { fontFamily: fontFamilyBold, fontWeight: '700', color: colors.text, fontSize: 21, letterSpacing: -0.8 }, compactValue: { fontSize: 17, letterSpacing: -0.4 }, negative: { color: colors.negative },
  usage: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }, track: { flex: 1, height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }, progress: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 }, overLimit: { backgroundColor: colors.negative }, usageLabel: { fontFamily, color: colors.secondary, fontSize: 10 },
  invoiceFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 5 }, due: { flex: 1 }, caption: { fontFamily, color: colors.secondary, fontSize: 11, lineHeight: 17 },
  invoiceButton: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44 }, pressed: { opacity: 0.7 },
  empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }, emptyCopy: { flex: 1, gap: 5 }, emptyTitle: { fontFamily: fontFamilyMedium, color: colors.text, fontSize: 14 },
});
