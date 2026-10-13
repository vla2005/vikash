import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import useReducedTransparency from '../../hooks/useReducedTransparency';
import { useTheme, useThemeStyles } from '../../contexts/ThemeContext';

export default function GlassMaterial({
  children,
  style,
  lens = false,
  blurred = true,
  navigation = false,
  strong = false,
}) {
  const reduced = useReducedTransparency();
  const {
    scheme,
    effects: { dock },
  } = useTheme();
  const styles = useThemeStyles(createStyles);
  const materialScheme = strong || lens ? 'dark' : scheme;
  const fill = reduced
    ? lens
      ? dock.solidLens
      : strong
      ? dock.solidStrong
      : navigation
      ? dock.solidFill
      : dock.solidControl
    : lens
    ? dock.lens
    : strong
    ? dock.strongFill
    : navigation
    ? dock.fill
    : dock.controlFill;
  const available =
    !reduced && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  if (available) {
    return (
      <GlassView
        colorScheme={materialScheme}
        glassEffectStyle="regular"
        isInteractive
        tintColor={
          lens
            ? dock.nativeLensTint
            : strong
            ? dock.nativeStrongTint
            : navigation
            ? dock.nativeNavigationTint
            : dock.nativeTint
        }
        style={[styles.native, navigation && styles.navigation, style]}
      >
        <View
          style={[[
            StyleSheet.absoluteFill,
            styles.film,
            {
              backgroundColor: fill,
            },
          ], pointerEventsStyles.none]}
        />
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        styles.shell,
        navigation && styles.navigation,
        style,
        reduced && { backgroundColor: fill },
      ]}
    >
      {!reduced && blurred && (
        <BlurView
          style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
          tint={
            materialScheme === 'dark'
              ? 'systemUltraThinMaterialDark'
              : 'systemUltraThinMaterialLight'
          }
          intensity={dock.blurIntensity}
        />
      )}
      <View
        style={[[
          StyleSheet.absoluteFill,
          {
            backgroundColor: fill,
          },
        ], pointerEventsStyles.none]}
      />
      {children}
    </View>
  );
}
const createStyles = (_colors, _type, { dock }) =>
  StyleSheet.create({
    native: { borderRadius: 40 },
    film: { borderRadius: 40 },
    shell: {
      overflow: 'hidden',
      borderRadius: 40,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: dock.controlRim,
    },
    navigation: { borderWidth: 1, borderColor: dock.rim },
    navigationSolid: { backgroundColor: dock.solidFill },
    solid: { backgroundColor: dock.solidControl },
  });
