import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useThemeTokens } from '../contexts/ThemeContext';
import { pointerEventsStyles } from '../theme/interaction';
import GlassMaterial from './silver/GlassMaterial';
// Mesmo material durante toda a expansão. O Android continua sem BlurView.
export default function ComposerGlass({ children }) {
  const { dock } = useThemeTokens();
  const id = `composer-${useId().replace(/:/g, '')}`;
  return (
    <GlassMaterial style={[styles.glass, { borderColor: dock.rim }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}
        accessible={false}
      >
        <Defs>
          <LinearGradient id={`${id}-film`} x1="0%" y1="0%" x2="20%" y2="100%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
            <Stop offset="0.30" stopColor="#FFFFFF" stopOpacity="0.02" />
            <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.16" />
          </LinearGradient>
          <RadialGradient id={`${id}-glint`}>
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.82" />
            <Stop offset="0.25" stopColor="#FFFFFF" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#${id}-film)`} />
        <Ellipse cx="18" cy="14" rx="16" ry="23" fill={`url(#${id}-glint)`} />
        <Ellipse
          cx="86"
          cy="88"
          rx="15"
          ry="24"
          fill={`url(#${id}-glint)`}
          opacity="0.6"
        />
      </Svg>
      {children}
    </GlassMaterial>
  );
}
const styles = StyleSheet.create({
  glass: { flex: 1, borderRadius: 100, borderWidth: 1, overflow: 'hidden' },
});
