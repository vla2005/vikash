import React from 'react';
import { assistantMotion } from '../../utils/assistantMotion';
import { SiriProvider } from '../../shared/components/reacticx/organisms/apple-intelligence';
const glow = { colors: ['#E6A64C', '#FF6B9D', '#B06BFF', '#58C9F5', '#E6A64C'], speed: 0.16 };
const border = { radius: 30, spread: 8, margin: 1 };
const wave = { strength: 0.65, origin: [0.5, 1] };
const shimmer = { amount: 0.3, speed: 2 };
export default function AssistantIntelligence({ active, children, onReady, renderOverlay, startupTrace, fallbackVisible, captureScope }) {
  return <SiriProvider captureScope={captureScope} fallbackVisible={fallbackVisible} startupTrace={startupTrace} active={active} introDuration={assistantMotion.openDuration} onReady={onReady} renderOverlay={renderOverlay} glow={glow}
    border={border} wave={wave} shimmer={shimmer}>{children}</SiriProvider>;
}
