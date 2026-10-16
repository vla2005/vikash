import { pointerEventsStyles } from '../../theme/interaction';
import React, { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated';
import useReducedMotion from '../../hooks/useReducedMotion';
import { useDock } from '../../contexts/DockContext';
import { dock } from '../../theme/silver';
import DockLayout, { DockTabButton, dockTabs, s } from './DockLayout';

const settle = {
  duration: 400,
  dampingRatio: 0.88,
  reduceMotion: ReduceMotion.Never,
};

function Tab({
  item,
  index,
  selected,
  width,
  progress,
  collapsed,
  onSelect,
  onExpand,
  onTouch,
}) {
  const isAndroid = Platform.OS === 'android';
  const active = selected === item.key;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      width: isAndroid ? width : width + (54 - width) * p,
      height: isAndroid ? 64 : 64 - 10 * p,
      opacity: active ? 1 : 1 - p,
      transform: [
        {
          translateX: (8 + index * width) * (1 - p) +
            (isAndroid ? (54 - width) * p / 2 : 0),
        },
        { translateY: isAndroid ? 0 : 5 * p },
      ],
    };
  });
  const label = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const icon = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * (1 - progress.get()) }],
  }));
  return (
    <Animated.View
      aria-hidden={collapsed && !active}
      style={[
        [s.tabFrame, style],
        pointerEventsStyles[collapsed && !active ? 'none' : 'auto'],
      ]}
    >
      <DockTabButton
        item={item}
        active={active}
        compact={width < 60}
        collapsed={collapsed}
        Box={Animated.View}
        labelStyle={label}
        iconStyle={icon}
        onExpand={onExpand}
        onSelect={onSelect}
        onPressIn={() => {
          if (active && !collapsed) {
            onTouch(true);
          }
        }}
        onPressOut={() => {
          if (active && !collapsed) {
            onTouch(false);
          }
        }}
      />
    </Animated.View>
  );
}

export default function GlassDock({
  selected,
  onSelect,
  onMicrophone,
  onAssistant,
  assistantOpen,
  microphoneOpen,
}) {
  const windowWidth = useWindowDimensions().width;
  const [width, setWidth] = useState(
    Math.min(windowWidth, 460) - dock.margin * 2,
  );
  const fallback = useSharedValue(0);
  const context = useDock();
  const progress = context?.progress || fallback;
  const railWidth = Math.max(210, width - dock.height - dock.gap);
  const tabWidth = (railWidth - 16) / 4;
  const reduced = useReducedMotion();
  const selectedIndex = Math.max(
    0,
    dockTabs.findIndex(item => item.key === selected),
  );
  const index = useSharedValue(selectedIndex);
  const pressed = useSharedValue(0);

  useEffect(() => {
    index.set(reduced ? selectedIndex : withSpring(selectedIndex, settle));
    pressed.set(0);
  }, [selectedIndex, reduced, index, pressed]);

  function touch(down) {
    pressed.set(reduced ? 0 : withSpring(down ? 1 : 0, settle));
  }

  function handleSelect(key) {
    const nextIndex = dockTabs.findIndex(item => item.key === key);
    if (nextIndex >= 0 && nextIndex !== selectedIndex) {
      index.set(reduced ? nextIndex : withSpring(nextIndex, settle));
      pressed.set(0);
    }
    onSelect?.(key);
  }

  const rail = useAnimatedStyle(() => ({
    width: railWidth + (54 - railWidth) * progress.get(),
    height: 64 - 10 * progress.get(),
    transform: [{ translateY: 5 * progress.get() }],
  }));
  const voice = useAnimatedStyle(() => ({
    width: railWidth - 64 * progress.get(),
    transform: [
      { translateX: 64 * progress.get() },
      { translateY: 62 * progress.get() },
    ],
  }));
  const lens = useAnimatedStyle(() => ({
    width: tabWidth * (1 - progress.get()) + 54 * progress.get(),
    height: 64 - 10 * progress.get(),
    transform: [
      {
        translateX: (8 + index.get() * tabWidth) * (1 - progress.get()),
      },
      { translateY: 5 * progress.get() },
      { scaleX: 1 + Math.max(0, pressed.get()) * 0.1 },
      { scaleY: 1 + Math.max(0, pressed.get()) * 0.12 },
    ],
  }));

  return (
    <DockLayout
      Box={Animated.View}
      railStyle={rail}
      voiceStyle={voice}
      lensStyle={lens}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onMicrophone={onMicrophone}
      onAssistant={onAssistant}
      assistantOpen={assistantOpen}
      microphoneOpen={microphoneOpen}
      renderTab={(item, tabIndex) => (
        <Tab
          key={item.key}
          item={item}
          index={tabIndex}
          width={tabWidth}
          selected={selected}
          progress={progress}
          collapsed={context?.collapsed}
          onExpand={context?.expand}
          onSelect={handleSelect}
          onTouch={touch}
        />
      )}
    />
  );
}
