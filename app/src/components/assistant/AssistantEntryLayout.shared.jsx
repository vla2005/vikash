import React, { useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AssistantIntro from './AssistantIntro';
export function useEntryLayout(focused) {
  const [measured,setMeasured]=useState(false), [fieldRect,setFieldRect]=useState(null);
  const dimensions=useWindowDimensions(), insets=useSafeAreaInsets();
  const compact=useRef(dimensions.height < 760).current;
  const [height,setHeight]=useState(Math.max(0,dimensions.height-insets.top-insets.bottom-64));
  const [introHeight,setIntroHeight]=useState(compact ? 111 : 142);
  const [fieldHeight,setFieldHeight]=useState(190);
  const rest=Math.max(0,height-fieldHeight);
  const introTop=compact ? 8 : 16;
  const target=focused ? Math.min(rest,introTop+introHeight+16) : rest;
  return {compact,target,introTop,introRoom:Math.max(0,target-introTop-4),ready:measured && !!fieldRect && fieldRect.height>0,
    onLayout:e=>{setHeight(e.nativeEvent.layout.height);setMeasured(true);},
    onIntro:e=>setIntroHeight(e.nativeEvent.layout.height),
    onField:e=>{setFieldHeight(e.nativeEvent.layout.height);setFieldRect(e.nativeEvent.layout);}};
}
export function EntryLayout({model,Box=View,fieldStyle,children,loading,onDismiss,onReady,deferIntro=false}) {
  useLayoutEffect(() => {if (model.ready) onReady?.();},[model.ready,onReady]);
  return <View testID="assistant-entry-layout" style={styles.fill} onLayout={model.onLayout}>
    {!deferIntro && <Pressable testID="assistant-welcome-anchor" accessible={false} onPress={onDismiss || Keyboard.dismiss}
      style={[styles.intro,{top:model.introTop,maxHeight:model.introRoom}]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View onLayout={model.onIntro}>{loading ? <ActivityIndicator color="#E6A64C" accessibilityLabel="Carregando histórico" /> : <AssistantIntro compact={model.compact} />}</View>
      </ScrollView>
    </Pressable>}
    <Box testID="assistant-entry-field" style={[styles.field,fieldStyle]} onLayout={model.onField}>{children}</Box>
  </View>;
}
const styles=StyleSheet.create({fill:{flex:1,minHeight:0},intro:{position:'absolute',left:24,right:24},field:{position:'absolute',left:0,right:0}});
