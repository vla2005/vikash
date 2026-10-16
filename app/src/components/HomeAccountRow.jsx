import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import InstitutionLogo from './InstitutionLogo';
import Icon from './Icon';
import {
  AnimatedPressable,
  AnimatedRevealValue,
} from './motion/AnimatedPrimitives';
import { useTheme, useThemeStyles } from '../contexts/ThemeContext';
import { getAccountType } from '../constants/accountTypes';
import { getInstitutionCardColor } from '../constants/financialInstitutionColors';
import { fontFamily, fontFamilyBold, fontFamilyMedium } from '../theme';
import { hiddenAmount } from '../utils/dashboard';
import { formatCurrency } from '../utils/money';

function HomeAccountRow({ account, hidden, onOpen }) {
  const { colors } = useTheme();
  const s = useThemeStyles(createStyles);
  const type = getAccountType(account.type);
  const accent = account.financialInstitution
    ? getInstitutionCardColor(account.financialInstitution)
    : type.color;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir conta ${account.description}`}
      disabled={!onOpen}
      scaleActive={0.975}
      onPress={() => onOpen?.(account.uuid)}
      style={s.cardRow}
    >
      <View style={[s.accentBar, { backgroundColor: accent }]} />

      <InstitutionLogo
        institution={account.financialInstitution}
        size={42}
        fallbackIcon={type.icon}
        fallbackColor={accent}
        backgroundColor={`${accent}18`}
      />

      <View style={s.copy}>
        <Text numberOfLines={1} style={s.name}>
          {account.description}
        </Text>
        <View style={s.badgeRow}>
          <View style={[s.typeBadge, { backgroundColor: `${accent}1A` }]}>
            <Text style={[s.caption, { color: accent }]}>{type.label}</Text>
          </View>
        </View>
      </View>

      <View style={s.rightCol}>
        <AnimatedRevealValue
          hidden={hidden}
          visibleContent={
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                s.amount,
                account.balance > 0 && s.positive,
                account.balance < 0 && s.negative,
              ]}
            >
              {formatCurrency(account.balance)}
            </Text>
          }
          hiddenContent={<Text style={s.amount}>{hiddenAmount}</Text>}
        />
      </View>

      <View style={s.chevronWrap}>
        <Icon name="chevron" size={14} color={colors.secondary} />
      </View>
    </AnimatedPressable>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    cardRow: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 74,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 14,
      bottom: 14,
      width: 3.5,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    name: {
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    caption: {
      fontFamily: fontFamilyMedium,
      fontSize: 11,
      lineHeight: 15,
    },
    rightCol: {
      maxWidth: '40%',
      alignItems: 'flex-end',
    },
    amount: {
      textAlign: 'right',
      fontFamily: fontFamilyBold,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 21,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    positive: { color: colors.positive },
    negative: { color: colors.negative },
    chevronWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default memo(HomeAccountRow);
