import { renderingEffects } from '../config/renderingEffects';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { creditCardLabel, formatLastFourDigits, formatInvoiceDate } from '../utils/creditCards';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import ScrollableCreditCardStack from './ScrollableCreditCardStack';
import useReducedMotion from '../hooks/useReducedMotion';
import { formatCurrency } from '../utils/money';
import { hiddenAmount } from '../utils/dashboard';
import { getInstitutionCardColor } from '../constants/financialInstitutionColors';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';

const statusLabels = { OPEN: 'Em aberto', CLOSED: 'Fechada', PAID: 'Paga' };
const reveal = 46;
// Sample the lift once; Animated interpolates it on the native driver.
const motionSteps = Array.from({ length: 21 }, (_, index) => index / 20);
const liftCurve = motionSteps.map(step => Math.sin(step * Math.PI));

function orderedCards(cards, selectedUuid) {
  return [...cards].sort((a, b) => Number(b.uuid === selectedUuid) - Number(a.uuid === selectedUuid));
}

export default function HomeCreditCards({ cards, profile, hidden = false, onOpenCard, onViewCards, title = 'Meus cartões', compactHeading = false, scrollable = false, onStackInteractionChange }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [selectedUuid, setSelectedUuid] = useState(cards[0]?.uuid);
  const [transition, setTransition] = useState(null);
  const [layersSwapped, setLayersSwapped] = useState(false);
  const [width, setWidth] = useState(320);
  const progress = useRef(new Animated.Value(0)).current;
  const switching = useRef(false);
  const scrollStack = useRef(null);
  const animation = useRef(null);
  const animationVersion = useRef(0);
  const reducedMotion = useReducedMotion();
  const selected = cards.find(card => card.uuid === selectedUuid) ?? cards[0];
  const selectedId = selected?.uuid;
  const cardHeight = width / 1.586;
  const rearCount = Math.min(2, Math.max(0, cards.length - 1));
  const frontY = rearCount * reveal;
  const currentOrder = orderedCards(cards, selectedId);
  const nextOrder = orderedCards(cards, transition ?? selectedId);

  const cancelAnimation = useCallback(() => {
    animationVersion.current++;
    animation.current?.stop();
  }, []);

  useEffect(() => {
    // A refreshed dashboard can remove a card or replace the entire list.
    cancelAnimation();
    switching.current = false;
    setTransition(null);
    setSelectedUuid(uuid => cards.some(card => card.uuid === uuid) ? uuid : cards[0]?.uuid);
    return cancelAnimation;
  }, [cards, cancelAnimation]);

  useEffect(() => {
    if (!reducedMotion || !transition) { return; }
    cancelAnimation();
    setSelectedUuid(transition);
    setTransition(null);
    switching.current = false;
  }, [reducedMotion, transition, cancelAnimation]);

function chooseCard(uuid) {
    if (scrollable) {
      if (uuid === selectedId) {
        scrollStack.current?.showSelected();
      } else {
        setSelectedUuid(uuid);
      }
      return;
    }
    if (switching.current || uuid === selectedId) { return; }
    if (reducedMotion) { setSelectedUuid(uuid); return; }
    switching.current = true;
    const version = ++animationVersion.current;
    progress.setValue(0);
    setLayersSwapped(false);
    setTransition(uuid);
    animation.current = Animated.timing(progress, {
      toValue: 0.5, duration: 430, easing: Easing.in(Easing.cubic), useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      if (!finished || version !== animationVersion.current) { return; }
      // Fabric orders siblings through React commits, not animated zIndex updates.
      // Change layers at the top of the lift, then settle on the new front layer.
      setLayersSwapped(true);
      animation.current = Animated.timing(progress, {
        toValue: 1, duration: 430, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
      animation.current.start(result => {
        if (!result.finished || version !== animationVersion.current) { return; }
        setSelectedUuid(uuid);
        setTransition(null);
        switching.current = false;
      });
    });
  }

  const invoice = selected?.currentInvoice;
  const usedLimit = selected ? Math.max(0, selected.creditLimit - selected.availableLimit) : 0;
  const usedPercentage = selected?.creditLimit > 0 ? usedLimit / selected.creditLimit * 100 : 0;
  const visibleIds = new Set([...currentOrder.slice(0, 3), ...nextOrder.slice(0, 3)].map(card => card.uuid));

  function renderCard(card) {
    const cardStyle = [s.card, { backgroundColor: getInstitutionCardColor(card.financialInstitution) }];
    const cardContent = <>
        <Svg width="100%" height="100%" viewBox="0 0 320 202" preserveAspectRatio="none" style={StyleSheet.absoluteFill} accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={Platform.OS === 'web' || undefined}>
          <Path d="M-20 180C50 180 72 54 142 96S220 172 340 32V230H-20Z" fill="#FFFFFF" opacity="0.045" />
          <Path d="M-20 234C86 168 142 204 202 118S286 70 350 136V230Z" fill="#051747" opacity="0.16" />
        </Svg>
        <View style={s.bankRow}><InstitutionLogo institution={card.financialInstitution} size={26} /><Text numberOfLines={1} style={s.bankName}>{card.financialInstitution?.name ?? 'Cartão de crédito'}</Text><Contactless /></View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={s.cardNumber}>{`•••• •••• •••• ${formatLastFourDigits(card.lastFourDigits) || '----'}`}</Text>
        <View style={s.cardFooter}><Text numberOfLines={1} style={s.holder}>{profile?.name ?? ''}</Text><Text style={s.credit}>Crédito</Text></View>
    </>;
    return <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar cartão ${creditCardLabel(card)}`}
      accessibilityState={{ selected: card.uuid === selectedId, disabled: !!transition }} disabled={!!transition}
      onPress={() => chooseCard(card.uuid)} style={cardStyle}>{cardContent}</Pressable>;
  }

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
      <View testID={scrollable ? "credit-card-stack" : undefined} onLayout={event => { const measured = event.nativeEvent.layout.width; if (measured > 0) { setWidth(measured); } }}
        style={[s.stack, { height: cardHeight + frontY }]}>
        {scrollable ? <ScrollableCreditCardStack ref={scrollStack} cards={cards} selectedUuid={selectedId} cardHeight={cardHeight} height={cardHeight + frontY} step={reveal} renderCard={renderCard} onInteractionChange={onStackInteractionChange} /> : cards.filter(card => visibleIds.has(card.uuid)).map(card => {
          const oldRank = currentOrder.findIndex(item => item.uuid === card.uuid);
          const newRank = nextOrder.findIndex(item => item.uuid === card.uuid);
          const incoming = transition === card.uuid;
          const oldY = frontY - Math.min(oldRank, 3) * reveal;
          const newY = frontY - Math.min(newRank, 3) * reveal;
          const oldScale = 1 - Math.min(oldRank, 3) * 0.045;
          const newScale = 1 - Math.min(newRank, 3) * 0.045;
          const moving = !!transition;
          const transform = moving && !reducedMotion ? [
            { translateY: progress.interpolate({
              inputRange: motionSteps,
              outputRange: motionSteps.map((step, index) => oldY + (newY - oldY) * step - (incoming ? liftCurve[index] * 110 : 0)),
            }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [oldScale, newScale] }) },
            { rotate: progress.interpolate({ inputRange: motionSteps, outputRange: liftCurve.map(lift => `${incoming ? lift * -3 : 0}deg`) }) },
          ] : [{ translateY: moving ? newY : oldY }, { scale: moving ? newScale : oldScale }];
          // Visible cards stay opaque. Only cards entering/leaving the three-card window fade.
          const opacity = moving && oldRank >= 3
            ? progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] })
            : moving && newRank >= 3 ? progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }) : 1;
          const zIndex = 4 - (moving && layersSwapped ? newRank : oldRank);
          const animatedStyle = { height: cardHeight, zIndex, transform, opacity };
          return <Animated.View key={card.uuid} style={[s.cardPosition, animatedStyle]}>
            {renderCard(card)}
          </Animated.View>;
        })}
      </View>
      {cards.length > 1 && <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dots}>
          {cards.map(card => <Pressable key={card.uuid} accessibilityRole="button" accessibilityLabel={`Mostrar cartão ${creditCardLabel(card)}`}
            accessibilityState={{ selected: card.uuid === selectedId, disabled: !!transition }} disabled={!!transition} onPress={() => chooseCard(card.uuid)} style={s.dotButton}>
            <View style={[s.dot, card.uuid === (transition ?? selectedId) && s.selectedDot]} />
          </Pressable>)}
        </ScrollView>
        <Text style={s.hint}>Toque em um cartão para selecionar</Text>
      </>}
      <View testID={scrollable ? "credit-card-stack-details" : undefined} accessibilityLiveRegion="polite" style={[s.details, cards.length === 1 && s.singleDetails]}>
        <Pressable accessibilityRole={onOpenCard ? 'button' : undefined} accessibilityLabel={onOpenCard ? `Abrir detalhes de ${creditCardLabel(selected)}` : undefined} disabled={!!transition || !onOpenCard} onPress={() => onOpenCard?.(selected.uuid)} style={({ pressed }) => [s.detailsLink, pressed && s.pressed]}>
        <View style={s.detailsCopy}>
        <View style={s.detailsHeading}><Text numberOfLines={2} style={s.detailsName}>{creditCardLabel(selected)}</Text>
          {!!invoice?.status && <Text style={[s.badge, invoice.status === 'CLOSED' && s.closedBadge, invoice.status === 'PAID' && s.paidBadge]}>{statusLabels[invoice.status] ?? invoice.status}</Text>}
        </View>
        <View style={s.metrics}>
          <View style={s.metric}><Text style={s.label}>Fatura atual</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, width < 340 && s.compactValue]}>{hidden ? hiddenAmount : formatCurrency(invoice?.total ?? 0)}</Text></View>
          <View style={[s.metric, s.divider]}><Text style={s.label}>Limite disponível</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, width < 340 && s.compactValue, !hidden && selected.availableLimit < 0 && s.negative]}>{hidden ? hiddenAmount : formatCurrency(selected.availableLimit)}</Text></View>
        </View>
        <View style={s.usage}><View accessibilityRole={hidden ? undefined : 'progressbar'} accessibilityLabel={hidden ? 'Limite utilizado. Valores ocultos.' : `Limite utilizado de ${creditCardLabel(selected)}`} accessibilityValue={hidden ? undefined : { min: 0, max: 100, now: Math.min(100, Math.round(usedPercentage)) }} style={s.track}>
          {!hidden && <View style={[s.progress, { width: `${Math.min(100, usedPercentage)}%` }, selected.availableLimit < 0 && s.overLimit]} />}
        </View><Text style={s.usageLabel}>{hidden ? hiddenAmount : `${Math.round(usedPercentage)}% utilizado`}</Text></View>
        </View>
        {!!onOpenCard && <Icon name="chevron" size={19} color={colors.primary} />}
        </Pressable>
        <View style={s.invoiceFooter}><View style={s.due}><Text style={s.caption}>{invoice ? `Vencimento em ${formatInvoiceDate(invoice.dueDate)}` : 'Nenhuma fatura em aberto'}</Text></View>
          {!!onOpenCard && <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${invoice ? 'fatura' : 'detalhes'} de ${creditCardLabel(selected)}`} disabled={!!transition} onPress={() => onOpenCard(selected.uuid, invoice?.uuid)} style={({ pressed }) => [s.invoiceButton, pressed && s.pressed]}>
            <Text style={s.link}>{invoice ? 'Ver fatura' : 'Ver cartão'}</Text><Icon name="chevron" size={16} color={colors.primary} />
          </Pressable>}
        </View>
      </View>
    </>}
  </View>;
}

function Contactless() {
  return <Svg width={23} height={23} viewBox="0 0 24 24" accessible={Platform.OS === 'web' ? undefined : false} aria-hidden={Platform.OS === 'web' || undefined}>
    <Path d="M5 9a5 5 0 010 6M9 6a10 10 0 010 12M13 3a15 15 0 010 18M17 1a19 19 0 010 22" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>;
}

const createStyles = (colors) => StyleSheet.create({
  section: { marginTop: 24 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontFamily: fontFamilyBold, fontWeight: '700', color: colors.text, fontSize: 22, letterSpacing: -0.7 },
  compactTitle: { fontSize: 17, letterSpacing: -0.3 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44 }, link: { fontFamily: fontFamilyMedium, color: colors.primary, fontSize: 12, fontWeight: '600' },
  stack: { position: 'relative', marginTop: 6, overflow: 'visible' }, cardPosition: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: { flex: 1, borderRadius: 20, padding: 14, overflow: 'hidden', justifyContent: 'space-between', boxShadow: renderingEffects.cardShadows ? colors.cardShadow : undefined },
  bankRow: { flexDirection: 'row', gap: 9, alignItems: 'center' }, bankName: { flex: 1, fontFamily: fontFamilyMedium, color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  cardNumber: { fontFamily: fontFamilyMedium, fontSize: 23, lineHeight: 30, fontWeight: '600', letterSpacing: 1.2, fontVariant: ['tabular-nums'], color: '#FFFFFF', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 }, holder: { flex: 1, fontFamily: fontFamilyMedium, fontSize: 12, color: '#FFFFFF' }, credit: { fontFamily, fontSize: 11, color: '#FFFFFF' },
  dots: { flexGrow: 1, justifyContent: 'center', paddingTop: 3 }, dotButton: { width: 30, height: 36, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.handle }, selectedDot: { width: 18, backgroundColor: colors.primary }, hint: { fontFamily, color: colors.secondary, fontSize: 11, textAlign: 'center', marginBottom: 14 },
  details: { backgroundColor: colors.surface, borderRadius: 22, padding: 16 }, singleDetails: { marginTop: 16 }, detailsHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 12 }, detailsCopy: { flex: 1, minWidth: 0 },
  detailsName: { flex: 1, fontFamily: fontFamilyBold, fontWeight: '700', fontSize: 16, color: colors.text, lineHeight: 23 },
  badge: { fontFamily: fontFamilyMedium, fontSize: 10, color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  closedBadge: { color: colors.warning, backgroundColor: colors.warningSoft }, paidBadge: { color: colors.positive, backgroundColor: colors.positiveSoft },
  metrics: { flexDirection: 'row', marginTop: 16, marginBottom: 14 }, metric: { flex: 1, minWidth: 0, gap: 4 }, divider: { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 14 },
  label: { fontFamily, color: colors.secondary, fontSize: 11 }, value: { fontFamily: fontFamilyBold, fontWeight: '700', color: colors.text, fontSize: 21, letterSpacing: -0.8 }, compactValue: { fontSize: 17, letterSpacing: -0.4 }, negative: { color: colors.negative },
  usage: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }, track: { flex: 1, height: 7, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }, progress: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 }, overLimit: { backgroundColor: colors.negative }, usageLabel: { fontFamily, color: colors.secondary, fontSize: 10 },
  invoiceFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 5 }, due: { flex: 1 }, caption: { fontFamily, color: colors.secondary, fontSize: 11, lineHeight: 17 },
  invoiceButton: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 44 }, pressed: { opacity: 0.7 },
  empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }, emptyCopy: { flex: 1, gap: 5 }, emptyTitle: { fontFamily: fontFamilyMedium, color: colors.text, fontSize: 14 },
});
