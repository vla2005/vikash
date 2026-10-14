import { renderingEffects } from '../../config/renderingEffects';
import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo, useId } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useDock } from '../../contexts/DockContext';
import useReducedTransparency from '../../hooks/useReducedTransparency';
import { useTheme, useThemeStyles } from '../../contexts/ThemeContext';

const shadeTexture = require('../../../assets/effects/header-shade.png');

export default memo(function HeaderBackdrop({ topInset = 0 }) {
  const styles = useThemeStyles(createStyles);
  const context = useDock();
  const {
    scheme,
    effects: { header },
  } = useTheme();
  const reduced = useReducedTransparency();
  const maskId = `header-fade-${useId().replace(/:/g, '')}`;
  const height = topInset + header.height;
  const fadeStart = (topInset + header.fadeStart) / height;
  const android = Platform.OS === 'android';

  if (reduced || (android && renderingEffects.backgroundBlur && !context?.blurTarget)) {
    return (
      <View
        style={[[StyleSheet.absoluteFill, styles.opaque], pointerEventsStyles.none]}
      />
    );
  }

  if (android && !renderingEffects.backgroundBlur) {
    // Um gradiente fixo separa o header sem capturar o conteúdo a cada frame.
    const shade = header.androidShade;
    return (
      <View
        accessible={false}
        style={[
          StyleSheet.absoluteFill,
          { bottom: -shade.overhang },
          pointerEventsStyles.none,
        ]}
      >
        <Image
          testID="android-header-shade"
          accessible={false}
          source={shadeTexture}
          tintColor={shade.color}
          resizeMode="stretch"
          resizeMethod="none"
          fadeDuration={0}
          style={[StyleSheet.absoluteFill, { opacity: shade.opacity }]}
        />
      </View>
    );
  }

  return (
    <MaskedView
      style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
      androidRenderingMode="hardware"
      maskElement={
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={maskId} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset={fadeStart} stopColor="#FFFFFF" />
              <Stop
                offset={(fadeStart + 1) / 2}
                stopColor="#FFFFFF"
                stopOpacity={0.4}
              />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill={`url(#${maskId})`} />
        </Svg>
      }
    >
      {/* Uma máscara fixa suaviza a borda sem empilhar camadas de blur. */}
      {renderingEffects.backgroundBlur && <BlurView
        style={StyleSheet.absoluteFill}
        tint={scheme}
        intensity={header.blurIntensity}
        {...(android && {
          blurTarget: context.blurTarget,
          blurMethod: 'dimezisBlurViewSdk31Plus',
        })}
      />}
      <View style={[StyleSheet.absoluteFill, styles.film]} />
    </MaskedView>
  );
});

const createStyles = (colors, _type, { header }) =>
  StyleSheet.create({
    film: { backgroundColor: header.fill },
    opaque: { backgroundColor: colors.background },
  });
