import React, { memo, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Skia,
  usePathInterpolation,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeTokens } from '../contexts/ThemeContext';
import { pointerEventsStyles } from '../theme/interaction';
import { createWavePaths } from '../utils/nativeWavePaths';

// Preparado uma vez ao carregar o módulo, antes de abrir o drawer.
const poses = createWavePaths(() => Skia.PathBuilder.Make());

export default memo(function ListeningWave({ active, compact }) {
  const { voiceOrb } = useThemeTokens();
  const phase = useSharedValue(0);
  const [width, setWidth] = useState(300);
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const running = active && foreground;
  const height = compact ? voiceOrb.wave.compactHeight : voiceOrb.wave.height;
  const scale = Math.min(width / 300, height / 76);
  const strands = usePathInterpolation(phase, poses.phases, poses.strands);
  const ribs = usePathInterpolation(phase, poses.phases, poses.ribs);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    cancelAnimation(phase);
    phase.set(0);
    if (running) {
      phase.set(
        withRepeat(
          withTiming(Math.PI * 2, {
            duration: voiceOrb.wave.duration,
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
  }, [phase, running, voiceOrb.wave.duration]);

  const colors = [
    voiceOrb.wave.color + '00',
    voiceOrb.wave.color + 'a6',
    voiceOrb.highlight,
    voiceOrb.wave.color + 'a6',
    voiceOrb.wave.color + '00',
  ];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.frame,
        { height },
        !active && styles.idle,
        pointerEventsStyles.none,
      ]}
    >
      <Canvas style={styles.canvas} opaque={false}>
        <Group
          transform={[
            { translateX: (width - 300 * scale) / 2 },
            { translateY: (height - 76 * scale) / 2 },
            { scale },
          ]}
        >
          <Group opacity={0.3}>
            <Path path={ribs} style="stroke" strokeWidth={0.8}>
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 300, y: 0 }}
                colors={colors}
                positions={[0, 0.2, 0.5, 0.8, 1]}
              />
            </Path>
          </Group>
          <Group opacity={0.65}>
            <Path
              path={strands}
              style="stroke"
              strokeWidth={0.8}
              strokeCap="round"
            >
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 300, y: 0 }}
                colors={colors}
                positions={[0, 0.2, 0.5, 0.8, 1]}
              />
            </Path>
          </Group>
        </Group>
      </Canvas>
    </View>
  );
});
const styles = StyleSheet.create({
  frame: { width: '100%', maxWidth: 300, marginTop: 8 },
  canvas: { flex: 1 },
  idle: { opacity: 0.2 },
});
