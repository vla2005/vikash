import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import SectionScreen from '../screens/SectionScreen';
import BottomNavigator from '../components/BottomNavigator';
import VoiceDrawer from '../components/VoiceDrawer';
import { colors } from '../theme';

const titles = { Statement: 'EXTRATO', AccountManagement: 'CONTAS', Categories: 'CATEGORIAS' };

export default function MainTabs() {
  const [selected, setSelected] = useState('Home');
  const [voiceVisible, setVoiceVisible] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS !== 'android') { return; }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected === 'Home') { return false; }
      setSelected('Home'); return true;
    });
    return () => subscription.remove();
  }, [selected]);
  return <View style={styles.background}>
    <View style={[styles.canvas, { paddingTop: insets.top }]}>
      <View style={styles.content}>{selected === 'Home' ? <HomeScreen /> : <SectionScreen title={titles[selected]} />}</View>
      <BottomNavigator selected={selected} onSelect={setSelected} onMicrophone={() => setVoiceVisible(true)} microphoneOpen={voiceVisible} />
    </View>
    <VoiceDrawer visible={voiceVisible} onClose={() => setVoiceVisible(false)} />
  </View>;
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.background },
  canvas: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center' },
  content: { flex: 1, paddingBottom: 18 },
});
