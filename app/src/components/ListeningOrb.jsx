import React, { memo, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeTokens } from '../contexts/ThemeContext';
import { pointerEventsStyles } from '../theme/interaction';
import { voiceOrb as defaultVoiceOrb } from '../theme/silver';
import { orbShaderSource, orbUniforms } from '../utils/orbShader';
import ListeningOrbSurface from './ListeningOrbSurface';
import { createOrbMesh, projectOrb } from '../utils/listeningOrb';

// Compilado uma vez, não a cada render/frame. Sem ray marching ou blur.
const effect = Skia.RuntimeEffect.Make(orbShaderSource);
// Falha gráfica não deve impedir a captura: mantém uma ilustração estática.
const fallback = effect
  ? null
  : projectOrb(
      createOrbMesh(8, 16),
      0,
      defaultVoiceOrb.radius,
      defaultVoiceOrb.deformation,
    );

export default memo(function ListeningOrb({
  active,
  size = defaultVoiceOrb.size,
}) {
  const { voiceOrb } = useThemeTokens();
  const phase = useSharedValue(0);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const running = active && foreground && !!effect;
  const palette = useMemo(() => orbUniforms(size, voiceOrb), [size, voiceOrb]);
  const uniforms = useDerivedValue(
    () => ({ ...palette, phase: phase.get() }),
    [palette, phase],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    cancelAnimation(phase);
    phase.set(0);
    if (running) {
      phase.set(
        withRepeat(
          withTiming(Math.PI * 2, {
            duration: voiceOrb.duration,
            easing: Easing.linear,
            reduceMotion: ReduceMotion.Never,
          }),
          -1,
          false,
          undefined,
          ReduceMotion.Never,
        ),
      );
    }
    return () => cancelAnimation(phase);
  }, [phase, running, voiceOrb.duration]);

  if (!effect) {
    return (
      <ListeningOrbSurface
        active={active}
        size={size}
        frontProps={{ d: fallback.front }}
        backProps={{ d: fallback.back }}
      />
    );
  }
  return (
    <View
      testID="listening-orb"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width: size, height: size },
        !active && styles.idle,
        pointerEventsStyles.none,
      ]}
    >
      <Canvas style={styles.canvas} opaque={false}>
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  idle: { opacity: 0.5 },
});
