import { pointerEventsStyles } from '../../theme/interaction';
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import useReducedMotion from '../../hooks/useReducedMotion';
import { useDock } from '../../contexts/DockContext';
import { dock } from '../../theme/silver';
import DockLayout, { DockTabButton, dockTabs, s } from './DockLayout';

export default function GlassDock({
  selected,
  onSelect,
  onMicrophone,
  onAssistant,
  microphoneOpen,
}) {
  const windowWidth = useWindowDimensions().width;
  const [width, setWidth] = useState(
    Math.min(windowWidth, 460) - dock.margin * 2,
  );
  const [pressed, setPressed] = useState(false);
  const context = useDock();
  const collapsed = !!context?.collapsed;
  const reduced = useReducedMotion();
  const railWidth = Math.max(210, width - dock.height - dock.gap);
  const tabWidth = (railWidth - 16) / 4;
  const index = Math.max(
    0,
    dockTabs.findIndex(item => item.key === selected),
  );
  useEffect(() => {
    setPressed(false);
  }, [selected]);
  const motion = {
    transitionProperty: 'transform,width,height,opacity',
    transitionDuration: reduced ? '0ms' : '260ms',
    transitionTimingFunction: 'cubic-bezier(.32,.72,0,1)',
  };
  const railStyle = {
    width: collapsed ? 54 : railWidth,
    height: collapsed ? 54 : 64,
    transform: [{ translateY: collapsed ? 5 : 0 }],
    ...motion,
  };
  const voiceStyle = {
    width: railWidth - (collapsed ? 64 : 0),
    transform: [
      { translateX: collapsed ? 64 : 0 },
      { translateY: collapsed ? 62 : 0 },
    ],
    ...motion,
  };
  const lensStyle = {
    width: collapsed ? 54 : tabWidth - 2,
    transform: [
      { translateX: collapsed ? 0 : 8 + index * tabWidth },
      { scale: !pressed || reduced ? 1 : 1.08 },
    ],
    ...motion,
  };
  const labelStyle = { opacity: collapsed ? 0 : 1, ...motion };
  const iconStyle = {
    transform: [{ translateY: collapsed ? 0 : -6 }],
    ...motion,
  };
  return (
    <DockLayout
      railStyle={railStyle}
      voiceStyle={voiceStyle}
      lensStyle={lensStyle}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      onMicrophone={onMicrophone}
      onAssistant={onAssistant}
      microphoneOpen={microphoneOpen}
      renderTab={(item, tabIndex) => {
        const active = item.key === selected;
        const tabStyle = {
          width: collapsed && active ? 54 : tabWidth,
          height: collapsed ? 54 : 64,
          opacity: active ? 1 : collapsed ? 0 : 1,
          transform: [
            { translateX: collapsed ? 0 : 8 + tabIndex * tabWidth },
            { translateY: collapsed ? 5 : 0 },
          ],
          ...motion,
        };
        return (
          <View
            key={item.key}
            aria-hidden={collapsed && !active}
            style={[[s.tabFrame, tabStyle], pointerEventsStyles[collapsed && !active ? 'none' : 'auto']]}
          >
            <DockTabButton
              item={item}
              active={active}
              compact={tabWidth < 60}
              collapsed={collapsed}
              onExpand={context?.expand}
              onSelect={onSelect}
              onPressIn={() => {
                if (active && !collapsed) {
                  setPressed(true);
                }
              }}
              onPressOut={() => setPressed(false)}
              labelStyle={labelStyle}
              iconStyle={iconStyle}
            />
          </View>
        );
      }}
    />
  );
}
