import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { fontFamilyMedium, fontFamily } from '../theme';
import { toast as defaultToast } from '../theme/silver';
import { useThemeTokens, useThemeStyles } from '../contexts/ThemeContext';

export const toastVariants = {
  success: { color: defaultToast.success, icon: 'check', title: 'Tudo certo' },
  error: {
    color: defaultToast.error,
    icon: 'close',
    title: 'Não foi possível concluir',
  },
  warn: {
    color: defaultToast.warning,
    icon: 'warning',
    title: 'Confira os dados',
  },
  info: { color: defaultToast.info, icon: 'info', title: 'Informação' },
};

export default function ToastContent({
  type = 'info',
  title,
  message,
  onClose,
  Box = View,
  style,
}) {
  const { toast } = useThemeTokens();
  const s = useThemeStyles(createStyles);
  const metadata = toastVariants[type] || toastVariants.info;
  const variant = {
    ...metadata,
    color: toast[type === 'warn' ? 'warning' : type] || toast.info,
  };
  const primary = title || message || variant.title;
  // Sucesso usa só a confirmação. Erros e avisos preservam a explicação.
  const detail =
    title && message && type !== 'success' && title !== message
      ? message
      : null;
  const announcement = detail ? `${primary}. ${detail}` : primary;
  return (
    <Box
      testID="toast"
      accessibilityRole="alert"
      accessibilityLabel={announcement}
      accessibilityLiveRegion={type === 'error' ? 'assertive' : 'polite'}
      style={[s.card, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar notificação"
        onPress={onClose}
        style={s.button}
      >
        <View
          style={[s.status, { borderColor: variant.color }]}
          accessible={false}
        >
          <Icon
            name={variant.icon}
            size={type === 'warn' ? 11 : 10}
            color={variant.color}
          />
        </View>
        <View style={s.copy}>
          <Text style={s.title}>{primary}</Text>
          {!!detail && <Text style={s.detail}>{detail}</Text>}
        </View>
      </Pressable>
    </Box>
  );
}

const createStyles = (_colors, _type, { toast }) =>
  StyleSheet.create({
    card: {
      alignSelf: 'center',
      maxWidth: '100%',
      borderRadius: 22,
      backgroundColor: toast.fill,
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    },
    button: {
      maxWidth: 360,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    status: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flexShrink: 1, gap: 3 },
    title: {
      fontFamily: fontFamilyMedium,
      color: toast.text,
      fontSize: 12,
      lineHeight: 18,
    },
    detail: {
      fontFamily,
      color: toast.secondary,
      fontSize: 12,
      lineHeight: 18,
    },
  });
