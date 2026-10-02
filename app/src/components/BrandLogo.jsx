import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import logo from '../assets/brand';

export default function BrandLogo({ centered = false }) {
  return (
    <View style={[styles.frame, centered && styles.centered]} accessibilityRole="image" accessibilityLabel="Vikash">
      <Image source={logo} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: 188, height: 54, overflow: 'hidden' },
  centered: { alignSelf: 'center' },
  image: { position: 'absolute', width: 260, height: 87, left: -40, top: -17 },
});
