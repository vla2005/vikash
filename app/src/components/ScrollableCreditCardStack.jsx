import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { AppState, Image, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { pointerEventsStyles } from '../theme/interaction';
import shadeTexture from '../../assets/effects/header-shade.png';
import {
  MotionBox,
  MotionCard,
  MotionScroller,
  useCardStackMotion,
} from './CardStackMotion';

// The parent reserves the same height as the original three-card stack.
// Only this clipped viewport scrolls; transforms and fades run on the native driver.
function ScrollableCreditCardStack(
  {
    cards,
    selectedUuid,
    cardHeight,
    height,
    step = 46,
    renderCard,
    onInteractionChange,
  },
  ref,
) {
  const { colors, scheme } = useTheme();
  const ordered = useMemo(
    () => [
      ...cards.filter(card => card.uuid !== selectedUuid).reverse(),
      ...cards.filter(card => card.uuid === selectedUuid),
    ],
    [cards, selectedUuid],
  );
  const maxScroll = Math.max(0, ordered.length - 1) * step;
  const anchor = Math.max(0, height - cardHeight);
  const selectedIndex = Math.max(
    0,
    ordered.findIndex(card => card.uuid === selectedUuid),
  );
  const initialOffset = useRef({ x: 0, y: selectedIndex * step }).current;
  const { scrollY, onScroll, topStyle, bottomStyle, reset, stop } =
    useCardStackMotion(initialOffset.y, maxScroll);
  const scroller = useRef(null);
  useImperativeHandle(
    ref,
    () => ({
      showSelected() {
        scroller.current?.scrollTo({ y: selectedIndex * step, animated: true });
      },
    }),
    [selectedIndex, step],
  );
  const measured = useRef(false);
  const selection = useRef(selectedUuid);
  const interacting = useRef(false);
  const momentum = useRef(false);
  const dragging = useRef(false);
  const touching = useRef(false);
  const releaseTimer = useRef(null);
  const interactionCallback = useRef(onInteractionChange);
  interactionCallback.current = onInteractionChange;

  const setInteraction = useCallback(active => {
    if (interacting.current !== active) {
      interacting.current = active;
      interactionCallback.current?.(active);
    }
  }, []);
  const release = useCallback(() => {
    clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      if (!momentum.current && !dragging.current && !touching.current)
        setInteraction(false);
    }, 100);
  }, [setInteraction]);
  const begin = useCallback(() => {
    clearTimeout(releaseTimer.current);
    setInteraction(true);
  }, [setInteraction]);
  const momentumBegin = useCallback(() => {
    momentum.current = true;
    begin();
  }, [begin]);
  const momentumEnd = useCallback(() => {
    momentum.current = false;
    clearTimeout(releaseTimer.current);
    if (!dragging.current && !touching.current) setInteraction(false);
  }, [setInteraction]);
  const touchBegin = useCallback(() => {
    touching.current = true;
    begin();
  }, [begin]);
  const touchEnd = useCallback(() => {
    touching.current = false;
    release();
  }, [release]);
  const dragBegin = useCallback(() => {
    dragging.current = true;
    begin();
  }, [begin]);
  const dragEnd = useCallback(() => {
    dragging.current = false;
    touching.current = false;
    release();
  }, [release]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        touching.current = false;
        dragging.current = false;
        momentum.current = false;
        clearTimeout(releaseTimer.current);
        setInteraction(false);
      }
    });
    return () => subscription.remove();
  }, [setInteraction]);

  useEffect(
    () => () => {
      clearTimeout(releaseTimer.current);
      if (interacting.current) interactionCallback.current?.(false);
      stop();
    },
    [stop],
  );

  useEffect(() => {
    if (!measured.current) return;
    const changed = selection.current !== selectedUuid;
    selection.current = selectedUuid;
    scroller.current?.scrollTo({ y: selectedIndex * step, animated: changed });
    if (!changed) reset(selectedIndex * step);
  }, [selectedUuid, selectedIndex, step, reset]);

  const measureContent = useCallback(() => {
    if (measured.current) return;
    measured.current = true;
    scroller.current?.scrollTo({ y: selectedIndex * step, animated: false });
    reset(selectedIndex * step);
  }, [selectedIndex, step, reset]);
  const shadeOpacity = scheme === 'dark' ? 0.88 : 0.24;

  return (
    <View
      testID="credit-card-stack-scroll-region"
      style={s.viewport}
      onTouchStartCapture={cards.length > 1 ? touchBegin : undefined}
      onTouchEndCapture={touchEnd}
      onTouchCancel={touchEnd}
    >
      <MotionScroller
        ref={scroller}
        testID="credit-card-stack-scroller"
        style={[s.scroller, Platform.OS === 'web' && s.webScroller]}
        contentContainerStyle={{ paddingTop: anchor }}
        contentOffset={initialOffset}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        nestedScrollEnabled
        scrollEnabled={cards.length > 1}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        snapToInterval={step}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={measureContent}
        onScrollBeginDrag={dragBegin}
        onScrollEndDrag={dragEnd}
        onMomentumScrollBegin={momentumBegin}
        onMomentumScrollEnd={momentumEnd}
      >
        {ordered.map((card, index) => (
          <MotionCard
            key={card.uuid}
            scrollY={scrollY}
            index={index}
            selected={card.uuid === selectedUuid}
            step={step}
            style={{
              height: cardHeight,
              marginTop: Number(index > 0) * (step - cardHeight),
              zIndex: card.uuid === selectedUuid ? cards.length + 1 : index + 1,
            }}
          >
            {renderCard(card)}
          </MotionCard>
        ))}
      </MotionScroller>
      <MotionBox
        testID="credit-card-stack-top-fade"
        accessible={false}
        style={[s.shade, s.topShade, topStyle, pointerEventsStyles.none]}
      >
        <Image
          source={shadeTexture}
          tintColor={colors.background}
          resizeMode="stretch"
          fadeDuration={0}
          accessible={false}
          style={[StyleSheet.absoluteFill, { opacity: shadeOpacity }]}
        />
      </MotionBox>
      <MotionBox
        testID="credit-card-stack-bottom-fade"
        accessible={false}
        style={[s.shade, s.bottomShade, bottomStyle, pointerEventsStyles.none]}
      >
        <Image
          source={shadeTexture}
          tintColor={colors.background}
          resizeMode="stretch"
          fadeDuration={0}
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            s.reverseShade,
            { opacity: shadeOpacity },
          ]}
        />
      </MotionBox>
    </View>
  );
}
const s = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden', borderRadius: 22 },
  scroller: { flex: 1 },
  webScroller: { overscrollBehaviorY: 'contain', touchAction: 'pan-y' },
  shade: { position: 'absolute', left: 0, right: 0, height: 36, zIndex: 30 },
  topShade: { top: 0 },
  bottomShade: { bottom: 0 },
  reverseShade: { transform: [{ rotate: '180deg' }] },
});

export default forwardRef(ScrollableCreditCardStack);
