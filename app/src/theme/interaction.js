import { StyleSheet } from 'react-native';

// Shared styles keep decorative layers and hidden controls from intercepting input.
export const pointerEventsStyles = StyleSheet.create({
  auto: { pointerEvents: 'auto' },
  none: { pointerEvents: 'none' },
  'box-none': { pointerEvents: 'box-none' },
});
