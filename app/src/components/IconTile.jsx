import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// A forma agrupa o ícone; a cor comunica o papel daquela informação.
export default function IconTile({ children, tone = 'primary', size = 42 }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: colors[`${tone}Soft`],
        },
      ]}
    >
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
