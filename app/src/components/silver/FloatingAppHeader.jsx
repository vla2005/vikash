import { pointerEventsStyles } from '../../theme/interaction';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppHeader from '../AppHeader';
import HeaderBackdrop from './HeaderBackdrop';
import { header } from '../../theme/silver';

export default function FloatingAppHeader({
  visible,
  topInset = 0,
  profile,
  onOpenProfile,
}) {
  return (
    <View
      testID="app-header"
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[[
        styles.overlay,
        {
          height: topInset + header.height,
          paddingTop: topInset + header.paddingTop,
        },
        !visible && styles.hidden,
      ], pointerEventsStyles["box-none"]]}
    >
      {visible && <HeaderBackdrop topInset={topInset} />}
      <AppHeader profile={profile} onOpenProfile={onOpenProfile} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: header.paddingHorizontal,
  },
  hidden: { display: 'none' },
});
