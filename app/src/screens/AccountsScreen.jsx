import React, { memo, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import GlassPanel from '../components/silver/GlassPanel';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import ScrollView from '../components/silver/DockScrollView';
import Skeleton, { CreditCardSkeleton, ListSkeleton } from '../components/Skeleton';
import Icon from '../components/Icon';
import InstitutionLogo from '../components/InstitutionLogo';
import CreditCardSummary from '../components/CreditCardSummary';
import HomeCreditCards from '../components/HomeCreditCards';
import SegmentedControl from '../components/SegmentedControl';
import {
  AnimatedPressable,
  StaggeredSection,
} from '../components/motion/AnimatedPrimitives';
import { getAccountType } from '../constants/accountTypes';
import { formatCurrency } from '../utils/money';
import { fontFamilyMedium, fontFamily, fontFamilyBold } from '../theme';

function AccountsScreen({
  accounts,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
  cards = [],
  cardsLoading = false,
  cardsError = '',
  onRetryCards,
  onCreateCard,
  onOpenCard,
  profile,
}) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const [section, setSection] = useState('accounts');
  const [stackInteracting, setStackInteracting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshStarted = useRef(false);

  useEffect(() => {
    if (!refreshing) return;
    if (loading || cardsLoading) {
      refreshStarted.current = true;
    } else if (refreshStarted.current) {
      refreshStarted.current = false;
      setRefreshing(false);
    }
  }, [refreshing, loading, cardsLoading]);

  function refresh() {
    refreshStarted.current = loading || cardsLoading;
    setRefreshing(true);
    onRetry();
    onRetryCards?.();
  }

  const total = accounts.reduce((sum, account) => sum + account.balance, 0);

  function feedback(message, retry, retryLabel, title, description) {
    return (
      <View style={s.feedback}>
        {message ? (
          <>
            <Text accessibilityRole="alert" style={s.caption}>
              {message}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
              onPress={retry}
              style={s.retry}
            >
              <Text style={s.link}>Tentar novamente</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Icon name="wallet" size={30} color={colors.primary} />
            <Text style={s.emptyTitle}>{title}</Text>
            <Text style={s.caption}>{description}</Text>
          </>
        )}
      </View>
    );
  }

  function creditCards() {
    return (
      <GlassPanel style={s.panel}>
        <View style={s.sectionHeader}>
          <View style={s.sectionCopy}>
            <Text style={s.eyebrow}>PORTFÓLIO DE CRÉDITO</Text>
            <Text accessibilityRole="header" style={s.sectionTitle}>
              Cartões de crédito
            </Text>
            <Text style={s.caption}>Suas faturas e limites</Text>
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Novo cartão"
            scaleActive={0.94}
            onPress={onCreateCard}
            style={s.add}
          >
            <Icon name="plus" size={20} color={colors.primary} />
            <Text style={s.link}>Novo cartão</Text>
          </AnimatedPressable>
        </View>
        {cardsLoading ? (
          <CreditCardSkeleton />
        ) : cardsError || !cards.length ? (
          feedback(
            cardsError,
            onRetryCards,
            'Tentar carregar cartões novamente',
            'Seu primeiro cartão começa aqui',
            'Organize suas faturas e seu limite de crédito.',
          )
        ) : (
          <>
            <HomeCreditCards
              cards={cards}
              profile={profile}
              onOpenCard={onOpenCard}
              title="Meus cartões"
              compactHeading
              scrollable
              onStackInteractionChange={setStackInteracting}
            />
            <View style={s.listHeading}>
              <Text accessibilityRole="header" style={s.sectionTitle}>
                Todos os cartões
              </Text>
              <Text style={s.caption}>
                {cards.length} {cards.length === 1 ? 'cartão' : 'cartões'}
              </Text>
            </View>
            {cards.map(card => (
              <CreditCardSummary
                key={card.uuid}
                card={card}
                onOpen={() => onOpenCard?.(card.uuid)}
                onInvoice={() =>
                  onOpenCard?.(card.uuid, card.currentInvoice?.uuid)
                }
              />
            ))}
          </>
        )}
      </GlassPanel>
    );
  }

  return (
    <ScrollView
      testID="accounts-screen-scroll"
      scrollEnabled={!stackInteracting}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          enabled={!stackInteracting}
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor="transparent"
          colors={['transparent']}
          progressBackgroundColor="transparent"
        />
      }
    >
      <StaggeredSection index={0}>
        <Text style={s.eyebrowHeader}>GESTÃO DE PATRIMÔNIO</Text>
        <Text accessibilityRole="header" style={s.title}>
          Contas e cartões
        </Text>
        <Text style={s.subtitle}>Seu dinheiro, do seu jeito.</Text>
      </StaggeredSection>

      <StaggeredSection index={1} triggerKey={section}>
        <GlassPanel style={s.workspace}>
          <SegmentedControl
            value={section}
            onChange={setSection}
            options={[
              {
                value: 'accounts',
                label: 'Contas',
                accessibilityLabel: 'Mostrar contas',
              },
              {
                value: 'cards',
                label: 'Cartões',
                accessibilityLabel: 'Mostrar cartões',
              },
            ]}
          />
          {section === 'accounts' ? (
            <>
              <View style={s.total}>
                <View style={s.sectionCopy}>
                  <Text style={s.eyebrow}>LIQUIDEZ CONSOLIDADA</Text>
                  <Text style={s.sectionTitle}>Seu dinheiro</Text>
                  <Text style={s.caption}>Saldo em contas</Text>
                </View>
                {loading ? (
                  <Skeleton width="40%" height={26} />
                ) : (
                  <Text
                    accessibilityLabel="Saldo total em contas"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    style={s.totalAmount}
                  >
                    {error ? '—' : formatCurrency(total)}
                  </Text>
                )}
              </View>
              {loading ? (
                <ListSkeleton
                  label="Carregando contas"
                  count={accounts.length || 3}
                />
              ) : error || !accounts.length ? (
                feedback(
                  error,
                  onRetry,
                  'Tentar carregar contas novamente',
                  'Suas contas começam aqui',
                  'Adicione uma conta para acompanhar seu saldo.',
                )
              ) : (
                accounts.map(account => {
                  const type = getAccountType(account.type);
                  return (
                    <AnimatedPressable
                      key={account.uuid}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir conta ${account.description}`}
                      scaleActive={0.98}
                      onPress={() => onEdit(account)}
                      style={s.row}
                    >
                      <InstitutionLogo
                        institution={account.financialInstitution}
                        size={43}
                        fallbackIcon={type.icon}
                        backgroundColor={
                          account.financialInstitution
                            ? colors.surface
                            : colors.surfaceMuted
                        }
                        fallbackColor={colors.text}
                      />
                      <View style={s.info}>
                        <Text numberOfLines={1} style={s.name}>
                          {account.description}
                        </Text>
                        <Text numberOfLines={1} style={s.caption}>
                          {type.label}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                        style={[
                          s.balance,
                          account.balance > 0 && s.positive,
                          account.balance < 0 && s.negative,
                        ]}
                      >
                        {formatCurrency(account.balance)}
                      </Text>
                      <Icon name="chevron" size={17} color={colors.secondary} />
                    </AnimatedPressable>
                  );
                })
              )}
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Nova conta"
                scaleActive={0.96}
                onPress={onCreate}
                style={s.create}
              >
                <Icon name="plus" size={22} color={colors.onBrand} />
                <Text style={s.createText}>Nova conta</Text>
              </AnimatedPressable>
            </>
          ) : (
            <View style={s.cardsOnly}>{creditCards()}</View>
          )}
        </GlassPanel>
      </StaggeredSection>
    </ScrollView>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 32, gap: 10 },
    eyebrowHeader: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.2,
      color: colors.primary,
      marginHorizontal: 6,
      marginBottom: 2,
    },
    eyebrow: {
      fontFamily: fontFamilyBold,
      fontSize: 10,
      letterSpacing: 1.1,
      color: colors.primary,
    },
    title: {
      fontFamily: fontFamilyBold,
      fontSize: 30,
      lineHeight: 38,
      letterSpacing: -1,
      color: colors.text,
      fontWeight: '700',
      marginHorizontal: 6,
    },
    subtitle: {
      fontFamily,
      fontSize: 14,
      lineHeight: 21,
      color: colors.secondary,
      marginTop: 2,
      marginBottom: 4,
      marginHorizontal: 6,
    },
    workspace: {
      backgroundColor: colors.surface,
      borderRadius: 26,
      padding: 16,
      gap: 6,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 26,
      padding: 16,
    },
    total: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    totalAmount: {
      fontFamily: fontFamilyBold,
      fontSize: 22,
      fontWeight: '700',
      color: colors.positive,
      fontVariant: ['tabular-nums'],
      maxWidth: '53%',
      letterSpacing: -0.7,
    },
    sectionCopy: { flex: 1, gap: 2 },
    sectionTitle: {
      fontFamily: fontFamilyBold,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.4,
    },
    caption: {
      fontFamily,
      fontSize: 12,
      lineHeight: 18,
      color: colors.secondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 70,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    info: { flex: 1, minWidth: 0, gap: 3 },
    name: {
      fontFamily: fontFamilyBold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    balance: {
      fontFamily: fontFamilyBold,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      maxWidth: '34%',
      fontVariant: ['tabular-nums'],
    },
    positive: { color: colors.positive },
    negative: { color: colors.negative },
    create: {
      backgroundColor: colors.brandPrimary,
      minHeight: 46,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    createText: {
      fontFamily: fontFamilyBold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.onBrand,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    add: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.28)',
      gap: 5,
    },
    link: {
      fontFamily: fontFamilyBold,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    feedback: { alignItems: 'center', paddingVertical: 24, gap: 10 },
    emptyTitle: {
      fontFamily: fontFamilyBold,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    retry: { padding: 12 },
    pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
    cardsOnly: { marginHorizontal: -16, marginBottom: -16, marginTop: 8 },
    listHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 24,
      marginBottom: 12,
    },
  });

export default memo(AccountsScreen);
