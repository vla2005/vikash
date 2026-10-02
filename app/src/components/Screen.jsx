import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export default function Screen({ children, contentStyle, decoration }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.background}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <View style={styles.canvas}>
          {decoration && <View pointerEvents="none" style={styles.decoration}>{decoration}</View>}
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) + 20, paddingBottom: Math.max(insets.bottom, 18) + 12 }, contentStyle]}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  decoration: { position: 'absolute', bottom: -32, right: -26, left: 24, height: 240 },
});
