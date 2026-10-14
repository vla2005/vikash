import { renderingEffects } from '../../config/renderingEffects';
import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, useThemeStyles } from '../../contexts/ThemeContext';
import useReducedTransparency from '../../hooks/useReducedTransparency';

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
    effects: { dock },
  } = useTheme();
  const styles = useThemeStyles(createStyles);
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
  return (
    <View
      style={[
        styles.shell,
        navigation && styles.navigation,
        renderingEffects.backgroundBlur && !reduced && blurred && !lens && styles.blur,
        {
          backgroundColor: fill,
        },
        style,
        reduced && { backgroundColor: fill },
      ]}
    >
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
      borderRadius: 40,
      borderWidth: 1,
      borderColor: dock.controlRim,
      overflow: 'hidden',
    },
    navigation: { borderColor: dock.rim },
    navigationSolid: { backgroundColor: dock.solidFill },
    solidLens: { backgroundColor: dock.solidLens },
    solid: { backgroundColor: dock.solidControl },
    navigationShine: { backgroundColor: dock.sheen },
    blur: { backdropFilter: 'blur(24px) saturate(110%)', WebkitBackdropFilter: 'blur(24px) saturate(110%)' },
    shine: {
      position: 'absolute',
      top: 0,
      left: 24,
      right: 24,
      height: 1,
      backgroundColor: dock.controlSheen,
    },
  });
