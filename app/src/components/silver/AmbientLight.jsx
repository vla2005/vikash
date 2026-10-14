import { renderingEffects } from '../../config/renderingEffects';
import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo, useEffect, useId, useState } from 'react';
import { AppState, Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import useReducedMotion from '../../hooks/useReducedMotion';
import { ambientLight as defaultAmbientLight } from '../../theme/silver';
import { useTheme, useThemeTokens } from '../../contexts/ThemeContext';

const lightTexture = require('../../../assets/effects/ambient-light.png');
const horizontalFade = require('../../../assets/effects/ambient-fade-horizontal.png');
const verticalFade = require('../../../assets/effects/ambient-fade-vertical.png');

const overscanX = 460 * defaultAmbientLight.overscan.horizontal;
const overscanY = defaultAmbientLight.overscan.vertical;
const fieldViewBox = `${-overscanX} ${-overscanY} ${460 + overscanX * 2} ${
  defaultAmbientLight.height + overscanY * 2
}`;

// A queda fica parada enquanto os focos se movem; as bordas nunca revelam o recorte.
const EdgeFade = memo(function EdgeFade({ id }) {
  const { horizontal, top, bottomStart } = defaultAmbientLight.edgeFade;
  const color = useTheme().colors.background;
  if (Platform.OS === 'android') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {[horizontalFade, verticalFade].map((source, index) => (
          <Image
            key={index}
            testID={'ambient-edge-fade-' + index}
            accessible={false}
            source={source}
            tintColor={color}
            resizeMode="stretch"
            resizeMethod="none"
            fadeDuration={0}
            style={StyleSheet.absoluteFill}
          />
        ))}
      </View>
    );
  }
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={`${id}-sides`} x1="0%" x2="100%" y1="0%" y2="0%">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset={horizontal / 2} stopColor={color} stopOpacity="0.25" />
          <Stop offset={horizontal} stopColor={color} stopOpacity="0" />
          <Stop offset={1 - horizontal} stopColor={color} stopOpacity="0" />
          <Stop
            offset={1 - horizontal / 2}
            stopColor={color}
            stopOpacity="0.25"
          />
          <Stop offset="1" stopColor={color} stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={`${id}-ends`} x1="0%" x2="0%" y1="0%" y2="100%">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset={top / 2} stopColor={color} stopOpacity="0.25" />
          <Stop offset={top} stopColor={color} stopOpacity="0" />
          <Stop offset={bottomStart} stopColor={color} stopOpacity="0" />
          <Stop
            offset={(1 + bottomStart) / 2}
            stopColor={color}
            stopOpacity="0.25"
          />
          <Stop offset="1" stopColor={color} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id}-sides)`} />
      <Rect width="100%" height="100%" fill={`url(#${id}-ends)`} />
    </Svg>
  );
});

const Field = memo(function Field({ field, index, active, reduced, id }) {
  const { ambientLight } = useThemeTokens();
  const direction = index === 0 ? 1 : -1;
  const opacity = ambientLight.intensity * (index === 0 ? 1 : 0.7);
  const motion = reduced
    ? {}
    : {
        animationName: {
          '0%': {
            opacity: opacity * 0.65,
            transform: [
              { translateX: -ambientLight.driftX * direction },
              { translateY: 0 },
              { scale: 1 },
            ],
          },
          '50%': {
            opacity,
            transform: [
              { translateX: ambientLight.driftX * direction },
              { translateY: ambientLight.driftY },
              { scale: ambientLight.scale },
            ],
          },
          '100%': {
            opacity: opacity * 0.65,
            transform: [
              { translateX: -ambientLight.driftX * direction },
              { translateY: 0 },
              { scale: 1 },
            ],
          },
        },
        animationDuration: ambientLight.duration * (index === 0 ? 1 : 1.4),
        animationIterationCount: 'infinite',
        animationTimingFunction: cubicBezier(0.77, 0, 0.175, 1),
        animationPlayState: active ? 'running' : 'paused',
      };
  return (
    <Animated.View
      // A imagem já é uma textura pequena: não criar outro cache do tamanho da tela.
      testID={'ambient-field-' + index}
      renderToHardwareTextureAndroid={false}
      style={[styles.field, { opacity: opacity * 0.8 }, motion]}
    >
      {Platform.OS === 'android' ? (
        <Image
          testID={'ambient-texture-' + index}
          source={lightTexture}
          resizeMode="stretch"
          resizeMethod="none"
          fadeDuration={0}
          tintColor={ambientLight.colors[index]}
          style={[
            styles.texture,
            {
              left:
                ((field.x * 460 - field.radiusX + overscanX) /
                  (460 + overscanX * 2)) *
                  100 +
                '%',
              top: field.y - field.radiusY + overscanY,
              width: ((field.radiusX * 2) / (460 + overscanX * 2)) * 100 + '%',
              height: field.radiusY * 2,
            },
          ]}
        />
      ) : (
        <Svg
          width="100%"
          height="100%"
          viewBox={fieldViewBox}
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient id={id}>
              <Stop
                offset="0"
                stopColor={ambientLight.colors[index]}
                stopOpacity="1"
              />
              <Stop
                offset={ambientLight.fadeStart}
                stopColor={ambientLight.colors[index]}
                stopOpacity="0.35"
              />
              <Stop
                offset="1"
                stopColor={ambientLight.colors[index]}
                stopOpacity="0"
              />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={field.x * 460}
            cy={field.y}
            rx={field.radiusX}
            ry={field.radiusY}
            fill={`url(#${id})`}
          />
        </Svg>
      )}
    </Animated.View>
  );
});

const AmbientLightContent = memo(function AmbientLightContent({ enabled = true }) {
  const { ambientLight } = useThemeTokens();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        [styles.clip, { height: ambientLight.height }],
        pointerEventsStyles.none,
      ]}
      testID="silver-ambient-light"
    >
      {ambientLight.fields.map((field, index) => (
        <Field
          key={index}
          field={field}
          index={index}
          active={active && enabled}
          reduced={reduced}
          id={`${id}-${index}`}
        />
      ))}
      <EdgeFade id={`${id}-fade`} />
    </View>
  );
});
export default memo(function AmbientLight(props) {
  return renderingEffects.ambientLight ? <AmbientLightContent {...props} /> : null;
});

const styles = StyleSheet.create({
  texture: { position: 'absolute' },
  clip: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  field: {
    position: 'absolute',
    left: `${-defaultAmbientLight.overscan.horizontal * 100}%`,
    right: `${-defaultAmbientLight.overscan.horizontal * 100}%`,
    top: -overscanY,
    bottom: -overscanY,
  },
});
