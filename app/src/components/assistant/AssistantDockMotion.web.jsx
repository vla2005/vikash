import React, { useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import DockAssistantContent, { assistantDockContentStyle } from '../silver/DockAssistantContent';
import AssistantReturnSurface from './AssistantReturnSurface';
import { useThemeTokens } from '../../contexts/ThemeContext';
import { assistantMotion } from '../../utils/assistantMotion';
const fill = { position:'absolute',inset:0,display:'flex' };
const flightStyle = {position:'absolute',zIndex:200,pointerEvents:'none',overflow:'hidden',display:'flex',boxSizing:'border-box'};
const labelStyle = {...fill};
export default function AssistantDockMotion({ children, backdrop, transition, opening, closing, onFinished, onOpened, onDockCovered, flightRef }) {
  const body = useRef(null), flight = useRef(null), label = useRef(null);
  const entering = transition?.direction === 'open';
  const covered = useRef(onDockCovered); covered.current=onDockCovered;
  const done = useRef(null); done.current = {open:onOpened,close:onFinished};
  const { dock } = useThemeTokens();
  useLayoutEffect(() => {
    if (!transition) return;
    const { from,to } = transition;
    if (entering) covered.current?.();
    const finish = () => done.current?.[entering ? 'open' : 'close']?.();
    const duration = entering ? assistantMotion.openDuration : assistantMotion.closeDuration;
    if (!flight.current?.animate) { const timer=setTimeout(finish,duration); return () => clearTimeout(timer); }
    const timing = { duration,easing:'cubic-bezier(.65,0,.35,1)',fill:'both' };
    const motion = flight.current.animate([
      { width:`${from.width}px`,height:`${from.height}px`,transform:'translate(0,0)',borderRadius:`${entering ? from.height/2 : 28}px` },
      { width:`${to.width}px`,height:`${to.height}px`,transform:`translate(${to.x-from.x}px,${to.y-from.y}px)`,borderRadius:`${entering ? 28 : to.height/2}px` },
    ], timing);
    const fade = body.current.animate(entering ? [{opacity:0},{opacity:0,offset:0.5},{opacity:1}] : [{opacity:1},{opacity:0}], entering ? timing : {duration:160,fill:'both'});
    const surface = flight.current.animate(entering ? [{opacity:1},{opacity:1,offset:0.75},{opacity:0}] : [{opacity:0},{opacity:1}], entering ? timing : {duration:80,fill:'both'});
    const caption = label.current.animate(entering ? [{opacity:1},{opacity:0,offset:0.5},{opacity:0}] : [{opacity:0},{opacity:1}],entering ? timing : {duration:300,delay:180,fill:'both'});
    motion.finished.then(finish).catch(() => {});
    return () => { motion.cancel(); fade.cancel(); surface.cancel(); caption.cancel(); };
  }, [transition,entering]);
  const from = transition?.from;
  const originStyle = from ? {...flightStyle,left:from.x,top:from.y,width:from.width,height:from.height,borderRadius:entering ? from.height/2 : 28,opacity:entering ? 1 : 0,border:`1px solid ${dock.rim}`} : null;
  const bodyStyle = {...fill,pointerEvents:closing || opening ? 'none' : undefined,opacity:opening ? 0 : 1};
  return <>
    {backdrop}
    <div ref={body} style={bodyStyle}>{children}</div>
    {from && <div ref={node => {flight.current=node; if (flightRef) flightRef.current=node;}} data-testid={entering ? 'assistant-open-flight' : 'assistant-return-flight'} aria-hidden
      style={originStyle}>
      <AssistantReturnSurface><div ref={label} style={labelStyle}><View style={assistantDockContentStyle}><DockAssistantContent /></View></div></AssistantReturnSurface>
    </div>}
  </>;
}
