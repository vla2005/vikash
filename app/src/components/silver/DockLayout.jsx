import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../Icon';
import GlassMaterial from './GlassMaterial';
import DockShade from './DockShade';
import { dock as defaultDock } from '../../theme/silver';
import { useThemeTokens, useThemeStyles } from '../../contexts/ThemeContext';
import { fontFamilyBold, fontFamilyMedium } from '../../theme';

export const dockTabs = [
  { key: 'Home', label: 'Início', icon: 'home' },
  { key: 'Statement', label: 'Extrato', icon: 'statement' },
  { key: 'AccountManagement', label: 'Contas', icon: 'wallet' },
  { key: 'Categories', label: 'Categorias', icon: 'categories' },
];

export function DockTabButton({
  item,
  active,
  collapsed,
  compact,
  onSelect,
  onExpand,
  onPressIn,
  onPressOut,
  Box = View,
  labelStyle,
  iconStyle,
}) {
  const { dock } = useThemeTokens();
  const s = useThemeStyles(createStyles);
  const hidden = collapsed && !active;
  return (
    <Pressable
      accessibilityRole={collapsed ? 'button' : 'tab'}
      accessibilityLabel={
        collapsed ? `Expandir navegação, ${item.label}` : item.label
      }
      accessibilityState={{ selected: active }}
      aria-selected={collapsed ? undefined : active}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      disabled={hidden}
      onPress={() => (collapsed ? onExpand?.() : onSelect(item.key))}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      pressRetentionOffset={{ top: 18, bottom: 18, left: 18, right: 18 }}
      style={({ pressed }) => [[s.tab, pressed && s.tabPressed], pointerEventsStyles[hidden ? 'none' : 'auto']]}
    >
      <Box style={iconStyle}>
        <Icon
          name={item.icon}
          size={28}
          color={active ? dock.activeText : dock.text}
        />
      </Box>
      <Box style={[s.tabLabel, labelStyle]}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[s.label, compact && s.smallLabel, active && s.activeLabel]}
        >
          {compact && item.key === 'Categories' ? 'Categ.' : item.label}
        </Text>
      </Box>
    </Pressable>
  );
}

export default function DockLayout({
  Box = View,
  railStyle,
  voiceStyle,
  lensStyle,
  renderTab,
  onLayout,
  onMicrophone,
  onAssistant,
  microphoneOpen,
}) {
  const { dock } = useThemeTokens();
  const s = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12) + 4;
  return (
    <View
      onLayout={onLayout}
      testID="bottom-navigator"
      style={[[s.dock, { bottom: bottomInset }], pointerEventsStyles["box-none"]]}
    >
      <DockShade bottomInset={bottomInset} />
      <Box style={[[s.rail, railStyle], pointerEventsStyles.none]}>
        <GlassMaterial navigation style={s.fill} />
      </Box>
      <Box style={[[s.lens, lensStyle], pointerEventsStyles.none]}>
        <GlassMaterial navigation lens style={s.fill} />
      </Box>
      {dockTabs.map(renderTab)}
      <Box style={[s.voice, voiceStyle]}>
        <GlassMaterial navigation blurred={Platform.OS !== 'android'} style={s.fill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pergunte ao ViKash"
            accessibilityHint="Disponível em breve"
            onPress={onAssistant}
            style={({ pressed }) => [s.voiceButton, pressed && s.pressed]}
          >
            <Icon name="sparkles" size={20} color={dock.voiceText} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={s.voiceLabel}
            >
              Pergunte ao ViKash
            </Text>
          </Pressable>
        </GlassMaterial>
      </Box>
      <View style={s.microphone}>
        <GlassMaterial navigation strong blurred={Platform.OS !== 'android'} style={s.fill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar por voz"
            accessibilityState={{ expanded: !!microphoneOpen }}
            onPress={onMicrophone}
            style={({ pressed }) => [s.micButton, pressed && s.pressed]}
          >
            <Icon name="microphone" size={30} color={dock.microphoneText} />
          </Pressable>
        </GlassMaterial>
      </View>
    </View>
  );
}

const createStyles = (_colors, _type, { dock }) =>
  StyleSheet.create({
    dock: {
      position: 'absolute',
      left: dock.margin,
      right: dock.margin,
      height: 116,
    },
    rail: {
      position: 'absolute',
      top: 52,
      left: 0,
      height: dock.height,
      borderRadius: 40,
      boxShadow: dock.shadow,
    },
    lens: { position: 'absolute', top: 57, left: 0, height: 54 },
    fill: { flex: 1 },
    tabFrame: { position: 'absolute', top: 52, height: dock.height },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    tabPressed: { opacity: 0.8 },
    tabLabel: {
      position: 'absolute',
      bottom: 5,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    label: {
      fontFamily: fontFamilyMedium,
      fontSize: 11,
      lineHeight: 14,
      color: dock.text,
    },
    smallLabel: { fontSize: 10 },
    activeLabel: { color: dock.activeText, fontFamily: fontFamilyBold },
    voice: {
      position: 'absolute',
      left: 0,
      top: 0,
      height: dock.voiceHeight,
      borderRadius: 40,
      boxShadow: dock.shadow,
    },
    voiceButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      gap: 9,
      minHeight: 44,
    },
    voiceLabel: {
      fontFamily: fontFamilyMedium,
      color: dock.voiceText,
      fontSize: 13,
      lineHeight: 18,
    },
    microphone: {
      position: 'absolute',
      right: 0,
      top: 52,
      width: dock.height,
      height: dock.height,
      borderRadius: 40,
      boxShadow: dock.shadow,
    },
    micButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  });

// Os wrappers animados reutilizam apenas a geometria fixa.
export const s = createStyles(null, null, { dock: defaultDock });
