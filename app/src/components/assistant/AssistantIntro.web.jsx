import React from 'react';
import AssistantIntroLayout from './AssistantIntroLayout';
import { assistantMotion } from '../../utils/assistantMotion';
const motion = {transitionDuration:`${assistantMotion.compactDuration}ms`,transitionTimingFunction:'cubic-bezier(.22,1,.36,1)'};
const normal = {
 frameStyle:{paddingBottom:30,transitionProperty:'padding-bottom',...motion}, copyStyle:{gap:12,transitionProperty:'gap',...motion},
 iconStyle:{height:30,transform:[{scale:1}],transitionProperty:'height,transform',...motion},
 titleStyle:{fontSize:27,lineHeight:36,transitionProperty:'font-size,line-height',...motion},
 captionStyle:{fontSize:14,lineHeight:22,transitionProperty:'font-size,line-height',...motion},
};
const compactStyles = {
 frameStyle:{...normal.frameStyle,paddingBottom:10},copyStyle:{...normal.copyStyle,gap:6},
 iconStyle:{...normal.iconStyle,height:24,transform:[{scale:0.8}]},
 titleStyle:{...normal.titleStyle,fontSize:22,lineHeight:29},captionStyle:{...normal.captionStyle,fontSize:12,lineHeight:18},
};
export default function AssistantIntro({ compact }) {
 return <AssistantIntroLayout {...(compact ? compactStyles : normal)} />;
}
