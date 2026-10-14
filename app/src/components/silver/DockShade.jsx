import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo, useId } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { dock as defaultDock } from '../../theme/silver';
import { useThemeTokens } from '../../contexts/ThemeContext';

const shadeTexture = require('../../../assets/effects/dock-shade.png');

// Contraste fixo atrás dos controles; não amostra blur nem acompanha a rolagem.
export default memo(function DockShade({ bottomInset }) {
  const { dock } = useThemeTokens();
  const shade = Platform.OS === 'android' ? dock.androidShade : dock.shade;
  const id = `dock-shade-${useId().replace(/:/g, '')}`;
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[[styles.shade, { top: -shade.overhang, bottom: -bottomInset }], pointerEventsStyles.none]}
    >
      {Platform.OS === 'android' ? (
        <Image
          testID="android-dock-shade"
          accessible={false}
          source={shadeTexture}
          tintColor={shade.color}
          resizeMode="stretch"
          resizeMethod="none"
          fadeDuration={0}
          style={StyleSheet.absoluteFill}
        />
      ) : <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0" stopColor={shade.color} stopOpacity={0} />
            <Stop
              offset="0.35"
              stopColor={shade.color}
              stopOpacity={shade.middleOpacity ?? 0.08}
            />
            <Stop
              offset="0.7"
              stopColor={shade.color}
              stopOpacity={shade.lowerOpacity ?? 0.66}
            />
            <Stop
              offset="1"
              stopColor={shade.color}
              stopOpacity={shade.opacity}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#${id})`} />
      </Svg>}
    </View>
  );
});

const styles = StyleSheet.create({
  shade: {
    position: 'absolute',
    top: -defaultDock.shade.overhang,
    left: -defaultDock.margin,
    right: -defaultDock.margin,
  },
});
