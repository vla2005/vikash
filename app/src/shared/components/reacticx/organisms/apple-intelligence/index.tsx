// Reacticx Apple Intelligence: capture the app once, present its shader in the
// same native window as the composer. The screenshot is not a per-frame blur.
import React, { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, PixelRatio, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Canvas, ColorShader, Fill, Shader, ImageShader, Skia, TileMode, type SkImage } from '@shopify/react-native-skia';
import { cancelAnimation, withTiming, ReduceMotion, Easing } from 'react-native-reanimated';
import captureAssistantBackground, {warmupAssistantCapture,getAssistantSourceRevision,getAssistantImageRevision} from '../../../../../services/assistantCapture';
import {captureCache,invalidateAssistantCapture,onAssistantSourceTouch} from '../../../../../services/assistantCaptureCache';
import { getSiriShader } from './conf';
import { useSiriUniforms } from './use-siri-uniforms';
import type { IAppleIntelligenceProvider } from './types';

type Props = IAppleIntelligenceProvider & {
  active: boolean;
  captureScope?: string;
  fallbackVisible?: boolean;
  startupTrace?: {mark:(stage:string)=>void} | null;
  onReady?: () => void;
  renderOverlay?: (backdrop: ReactNode) => ReactNode;
};
export const SiriProvider = memo(function SiriPresentation({
  children, active, onReady, renderOverlay, startupTrace, captureScope, fallbackVisible = true, introDuration = 680,
  wave, noise, glow, shimmer, border,
}: Props) {
  const view = useRef<View>(null);
  const [layout, setLayout] = useState({ width:0, height:0 });
  const [snapshot, setSnapshot] = useState<SkImage | null>(null);
  const [shader, setShader] = useState<ReturnType<typeof getSiriShader>>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const diagnostics=useRef(startupTrace);diagnostics.current=startupTrace;
  const ready = useRef(onReady);
  ready.current = onReady;
  const { iTime, intensity, uniforms, applyConfig, frameCallback } = useSiriUniforms({
    layout, defaultWave:wave, defaultNoise:noise, defaultGlow:glow,
    defaultShimmer:shimmer, defaultBorder:border,
  });
  const appliedConfig=useRef<typeof applyConfig | null>(null);
  const configure=useCallback(()=>{
    if(Platform.OS !== 'android' || appliedConfig.current!==applyConfig){
      applyConfig();appliedConfig.current=applyConfig;
    }
  },[applyConfig]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {if(state !== 'active')invalidateAssistantCapture();setForeground(state === 'active');});
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if(Platform.OS !== 'android' || !global.requestIdleCallback)return;
    const task=global.requestIdleCallback(()=>{warmupAssistantCapture(view);getSiriShader();configure();});
    return ()=>global.cancelIdleCallback?.(task);
  },[configure]);
  useEffect(() => {if(Platform.OS !== 'android')return;invalidateAssistantCapture();return invalidateAssistantCapture;},[captureScope]);
  useEffect(() => {
    if (!active || !foreground || !layout.width || !layout.height || (Platform.OS === 'android' && !fallbackVisible)) return;
    const trace=diagnostics.current;
    const sourceRevision=Platform.OS === 'android' ? getAssistantSourceRevision() : 0;
    const cacheBase=`${captureScope || 'assistant'}:${layout.width}:${layout.height}:${PixelRatio.getFontScale()}`;
    const cacheKey=`${cacheBase}:${sourceRevision}`;
    const version=captureCache.version();
    let disposed = false;
    let stage = 'shader';
    let raw: SkImage | null = null;
    let image: SkImage | null = null;
    async function capture() {
      try {
        trace?.mark('shader-start');
        const compiled = getSiriShader();
        trace?.mark('shader-ready');
        if (compiled) {
          setShader(compiled);
          configure();
          iTime.set(0); intensity.set(0);
          frameCallback.setActive(true);
          intensity.set(withTiming(1, { duration:introDuration,
            easing:Easing.bezier(0.25, 0.1, 0.25, 1), reduceMotion:ReduceMotion.Never }));
        }
        const cached=Platform.OS === 'android' ? captureCache.acquire(cacheKey) : null;
        if(cached){trace?.mark('background-cache-hit');setSnapshot(cached);return;}
        trace?.mark('background-cache-miss');
        stage = 'capture';trace?.mark('capture-start');
        raw = await captureAssistantBackground(view, trace, {width:layout.width,height:layout.height});
        if (disposed || !raw) return;
        trace?.mark('capture-ready');
        stage = 'blur';
        // A blurred background needs fewer pixels than the sharp UI. Cap the
        // offscreen buffer and make it portable across the modal's GPU surface.
        const width = Math.min(raw.width(), Math.ceil(layout.width * 1.5), 720);
        const height = Math.max(1, Math.round(raw.height() * width / raw.width()));
        const surface = Platform.OS === 'android' ? Skia.Surface.Make(width, height) : Skia.Surface.MakeOffscreen(width, height);
        if (!surface) return;
        let filtered: SkImage | null = null;
        try {
          const paint = Skia.Paint();
          const sigma = 12 * width / layout.width;
          paint.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
          surface.getCanvas().drawImageRect(raw,
            { x:0, y:0, width:raw.width(), height:raw.height() },
            { x:0, y:0, width, height }, paint);
          surface.flush();
          filtered = surface.makeImageSnapshot();
          image = Platform.OS === 'android' ? filtered : filtered.makeNonTextureImage();
        } finally { if (filtered !== image) filtered?.dispose(); surface.dispose(); }
        if (disposed) { image?.dispose(); return; }
        if (image && compiled) {
          trace?.mark('background-ready');
          if(Platform.OS === 'android'){
            const capturedRevision=getAssistantImageRevision(raw,sourceRevision);
            if(capturedRevision!==getAssistantSourceRevision())invalidateAssistantCapture();
            captureCache.store(`${cacheBase}:${capturedRevision}`,version,image);
          }
          setSnapshot(image);
        }
        else image?.dispose();
      } catch (error) {
        // Technical diagnostics only: never log screenshots, messages or files.
        if (__DEV__) console.warn(`[ViKash assistant effect] ${stage} unavailable`, error instanceof Error ? error.message : 'native effect unavailable');
      } finally { raw?.dispose(); if (!disposed) ready.current?.(); }
    }
    const frame = requestAnimationFrame(() => { capture(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      frameCallback.setActive(false);
      cancelAnimation(intensity);
      setSnapshot(null);
    };
  }, [active, foreground, layout.width, layout.height, configure, frameCallback, iTime, intensity, introDuration, captureScope, fallbackVisible]);
  useEffect(() => () => { if(snapshot)captureCache.release(snapshot); }, [snapshot]);
  const backdrop = active && foreground && layout.width > 0 && layout.height > 0 ?
    <View testID="assistant-native-effect" style={styles.overlay} accessible={false}>
      {!snapshot && (Platform.OS !== 'android' || fallbackVisible) && <BlurView testID="assistant-blur-fallback" style={StyleSheet.absoluteFill}
        blurTarget={view} blurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} tint="dark" intensity={45} />}
      {shader && (Platform.OS !== 'android' || fallbackVisible) && <Canvas testID="assistant-effect-canvas" style={{ width:layout.width, height:layout.height }}>
        <Fill><Shader source={shader} uniforms={uniforms}>
          {snapshot ? <ImageShader image={snapshot} fit="cover" width={layout.width} height={layout.height} /> : <ColorShader color="transparent" />}
        </Shader></Fill>
      </Canvas>}
    </View> : null;
  return <View style={styles.fill}>
    <BlurTargetView onTouchStart={Platform.OS === 'android' ? onAssistantSourceTouch : undefined} ref={view} testID="assistant-capture-target" style={styles.fill} collapsable={false}
      accessibilityElementsHidden={active} importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        if(Platform.OS === 'android' && (width!==layout.width || height!==layout.height))invalidateAssistantCapture();
        setLayout(old => old.width === width && old.height === height ? old : { width, height });
      }}>{children}</BlurTargetView>
    {renderOverlay ? renderOverlay(backdrop) : backdrop}
  </View>;
});
export default SiriProvider;
const styles = StyleSheet.create({ fill:{ flex:1 }, overlay:{ ...StyleSheet.absoluteFill, zIndex:50, pointerEvents:'none' } });
