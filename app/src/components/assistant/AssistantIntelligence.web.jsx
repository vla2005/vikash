/* eslint-env browser */
import React, { useEffect, useState } from 'react';
import { assistantMotion } from '../../utils/assistantMotion';
import { StyleSheet, View } from 'react-native';
const contentStyle = { display:'flex', flex:1, minHeight:0 };
const animatedContent = { animation:`vikash-intelligence-glass ${assistantMotion.openDuration}ms ease both` };
const releasingContent = { animation:`vikash-intelligence-release ${assistantMotion.closeDuration}ms ease both` };
const css = `
@keyframes vikash-intelligence-border-enter { from { opacity:0; } to { opacity:1; } }
@keyframes vikash-intelligence-border-exit { from { opacity:1; } to { opacity:0; } }
@keyframes vikash-intelligence-release { from { transform:scale(1.015);filter:blur(8px) brightness(.75); } to { transform:scale(1);filter:blur(0) brightness(1); } }
@keyframes vikash-intelligence-spin { to { transform:rotate(360deg); } }
@keyframes vikash-intelligence-glass { 0% { transform:scale(1); filter:blur(0px) brightness(1); } 45% { transform:scale(1.035); filter:blur(6px) brightness(1.2); } 100% { transform:scale(1.015); filter:blur(8px) brightness(.75); } }
.vikash-intelligence-border { position:absolute; inset:0; padding:6px; border-radius:30px; pointer-events:none; overflow:hidden; z-index:50; animation:vikash-intelligence-border-enter ${assistantMotion.openDuration}ms ease both; mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); mask-composite:exclude; }
.vikash-intelligence-border::before { content:''; position:absolute; inset:-75%; background:conic-gradient(#e6a64c,#ff6b9d,#b06bff,#58c9f5,#e6a64c); animation:vikash-intelligence-spin 12s linear infinite; }
.vikash-intelligence-border.closing { animation:vikash-intelligence-border-exit ${assistantMotion.closeDuration}ms ease both; }
.vikash-intelligence-border.paused::before { animation-play-state:paused; }
`;
export default function AssistantIntelligence({ active, children, onReady, renderOverlay, closing }) {
  const [foreground, setForeground] = useState(!document.hidden);
  useEffect(() => {
    const listener = () => setForeground(!document.hidden);
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  useEffect(() => {
    if (!active || closing) return;
    const timer = setTimeout(() => onReady?.(), 450);
    return () => clearTimeout(timer);
  }, [active, onReady, closing]);
  return <><View style={styles.root}>
    <style>{css}</style>
    <div inert={active ? true : undefined} aria-hidden={active || undefined}
      style={{ ...contentStyle, ...(active ? closing ? releasingContent : animatedContent : {}) }}>{children}</div>
    {active && <div aria-hidden className={`vikash-intelligence-border${foreground ? '' : ' paused'}${closing ? ' closing' : ''}`} />}
  </View>{renderOverlay?.(null)}</>;
}
const styles = StyleSheet.create({ root: { flex:1, overflow:'hidden' } });
