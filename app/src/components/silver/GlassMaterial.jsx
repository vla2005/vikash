import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDock } from '../../contexts/DockContext';
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
  const context = useDock();
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
  // A lente já está sobre a barra desfocada: uma segunda amostragem só soma custo.
  const shouldBlur =
    !reduced &&
    blurred &&
    (Platform.OS !== 'android' || (!!context?.blurTarget && !lens));
  return (
    <View
      style={[
        styles.shell,
        navigation && styles.navigation,
        style,
        reduced && { backgroundColor: fill },
      ]}
    >
      {shouldBlur && (
        <BlurView
          style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
          tint={materialScheme}
          intensity={dock.blurIntensity}
          blurTarget={context?.blurTarget}
          blurMethod={
            Platform.OS === 'android' && context
              ? 'dimezisBlurViewSdk31Plus'
              : 'none'
          }
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
      <View
        style={[[styles.shine, navigation && styles.navigationShine], pointerEventsStyles.none]}
      />
      {children}
    </View>
  );
}
const createStyles = (_colors, _type, { dock }) =>
  StyleSheet.create({
    shell: {
      overflow: 'hidden',
      borderRadius: 40,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: dock.controlRim,
    },
    navigation: { borderWidth: 1, borderColor: dock.rim },
    navigationSolid: { backgroundColor: dock.solidFill },
    navigationShine: { backgroundColor: dock.sheen },
    solid: { backgroundColor: dock.solidControl },
    shine: {
      position: 'absolute',
      top: 0,
      left: 24,
      right: 24,
      height: StyleSheet.hairlineWidth,
      backgroundColor: dock.controlSheen,
    },
  });
