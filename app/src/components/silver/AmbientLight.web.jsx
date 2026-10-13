import { pointerEventsStyles } from '../../theme/interaction';
/* eslint-env browser */
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ambientLight as defaultAmbientLight } from '../../theme/silver';
import { useThemeTokens, useThemeStyles } from '../../contexts/ThemeContext';
import useReducedMotion from '../../hooks/useReducedMotion';

export default memo(function AmbientLight({ enabled = true }) {
  const { ambientLight } = useThemeTokens();
  const styles = useThemeStyles(createStyles);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(!document.hidden);
  useEffect(() => {
    const visibility = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    const sheet = document.createElement('style');
    sheet.textContent = `@keyframes vikash-silver-light{0%,100%{transform:translate3d(calc(-1 * var(--drift)),0,0) scale(1);opacity:var(--low)}50%{transform:translate3d(var(--drift),${ambientLight.driftY}px,0) scale(${ambientLight.scale});opacity:var(--high)}}`;
    document.head.appendChild(sheet);
    return () => {
      sheet.remove();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [ambientLight.driftY, ambientLight.scale]);
  return (
    <View
      aria-hidden="true"
      testID="silver-ambient-light"
      style={[[styles.clip, { height: ambientLight.height }], pointerEventsStyles.none]}
    >
      {ambientLight.fields.map((field, index) => {
        const opacity = ambientLight.intensity * (index === 0 ? 1 : 0.7);
        const color = ambientLight.colors[index];
        const centerX =
          ((field.x + ambientLight.overscan.horizontal) /
            (1 + ambientLight.overscan.horizontal * 2)) *
          100;
        const animationStyle = {
          animation: reduced
            ? 'none'
            : `vikash-silver-light ${
                ambientLight.duration * (index === 0 ? 1 : 1.4)
              }ms cubic-bezier(.77,0,.175,1) infinite`,
          animationPlayState: active && enabled ? 'running' : 'paused',
        };
        return (
          <View
            key={index}
            testID="silver-light-field"
            style={[
              styles.field,
              {
                opacity: opacity * 0.8,
                '--drift': `${ambientLight.driftX * (index === 0 ? 1 : -1)}px`,
                '--low': String(opacity * 0.65),
                '--high': String(opacity),
                backgroundImage: `radial-gradient(ellipse ${field.radiusX}px ${
                  field.radiusY
                }px at ${centerX}% ${
                  field.y + ambientLight.overscan.vertical
                }px,${color} 0%,${color}59 ${
                  ambientLight.fadeStart * 100
                }%,transparent 100%)`,
              },
              animationStyle,
            ]}
          />
        );
      })}
      <View testID="silver-light-edge-fade" style={styles.fade} />
    </View>
  );
});
const { horizontal, top, bottomStart } = defaultAmbientLight.edgeFade;
const createStyles = ({ background }) =>
  StyleSheet.create({
    clip: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      overflow: 'hidden',
    },
    field: {
      position: 'absolute',
      left: `${-defaultAmbientLight.overscan.horizontal * 100}%`,
      right: `${-defaultAmbientLight.overscan.horizontal * 100}%`,
      top: -defaultAmbientLight.overscan.vertical,
      bottom: -defaultAmbientLight.overscan.vertical,
    },
    fade: {
      ...StyleSheet.absoluteFill,
      backgroundImage: `linear-gradient(to right,${background} 0%,${background}40 ${
        horizontal * 50
      }%,transparent ${horizontal * 100}%,transparent ${
        (1 - horizontal) * 100
      }%,${background}40 ${
        (1 - horizontal / 2) * 100
      }%,${background} 100%),linear-gradient(to bottom,${background} 0%,${background}40 ${
        top * 50
      }%,transparent ${top * 100}%,transparent ${
        bottomStart * 100
      }%,${background}40 ${(1 + bottomStart) * 50}%,${background} 100%)`,
    },
  });
