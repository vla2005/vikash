import { pointerEventsStyles } from '../../theme/interaction';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import useReducedTransparency from '../../hooks/useReducedTransparency';
import { useTheme } from '../../contexts/ThemeContext';

export default memo(function HeaderBackdrop({ topInset = 0 }) {
  const {
    colors,
    effects: { header },
  } = useTheme();
  const reduced = useReducedTransparency();
  const height = topInset + header.height;
  const fadeStart = ((topInset + header.fadeStart) / height) * 100;
  const fadeMiddle = (fadeStart + 100) / 2;
  const mask = `linear-gradient(to bottom, #000 0%, #000 ${fadeStart}%, rgba(0,0,0,0.4) ${fadeMiddle}%, transparent 100%)`;
  const blur = `blur(${header.webBlurRadius}px)`;

  return (
    <View
      style={[[
        StyleSheet.absoluteFill,
        reduced
          ? { backgroundColor: colors.background }
          : {
              backgroundColor: header.fill,
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              maskImage: mask,
              WebkitMaskImage: mask,
            },
      ], pointerEventsStyles.none]}
    />
  );
});
