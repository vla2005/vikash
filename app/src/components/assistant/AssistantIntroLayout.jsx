import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '../Icon';
import { fontFamily, fontFamilyBold } from '../../theme';
export default function AssistantIntroLayout({ Box=View, Copy=View, Label=Text, frameStyle, copyStyle, iconStyle, titleStyle, captionStyle }) {
  return <Box testID="assistant-intro-copy" style={[styles.frame,frameStyle]}>
    <Copy style={[styles.copy,copyStyle]}>
      <Box style={[styles.icon,iconStyle]}><Icon name="sparkles" size={30} color="#E6A64C" /></Box>
      <Label accessibilityRole="header" style={[styles.title,titleStyle]}>Como posso ajudar?</Label>
      <Label style={[styles.caption,captionStyle]}>Pergunte, envie um comprovante ou fotografe um documento.</Label>
    </Copy>
  </Box>;
}
const styles = StyleSheet.create({
  frame:{paddingBottom:30},copy:{alignItems:'center',gap:12},icon:{height:30,alignItems:'center',justifyContent:'center'},
  title:{color:'#FFFFFF',fontFamily:fontFamilyBold,fontWeight:'700',fontSize:27,lineHeight:36,letterSpacing:-0.8,textAlign:'center'},
  caption:{color:'#D0D0D4',fontFamily,fontSize:14,lineHeight:22,textAlign:'center'},
});
