// Mesmo placeholder escalonado do Reacticx com CSS na web, sem carregar Worklets.
import React, { forwardRef, memo } from 'react';
import { StyleSheet } from 'react-native';
import { InputBar } from './shared';
const motion = `@keyframes vikash-input-character { from { opacity:0; transform:translateY(10px) scale(.85) } to { opacity:1; transform:translateY(0) scale(1) } }`;
const letterStyle = { display: 'inline-block', whiteSpace: 'pre' };
const Character = memo(function InputCharacter({
  char,
  index,
  enterDuration,
  delayIncrement,
  style,
}) {
  const flattened = StyleSheet.flatten(style);
  return (
    <span
      style={{
        ...flattened,
        ...letterStyle,
        lineHeight: `${flattened.lineHeight}px`,
        animation: `vikash-input-character ${enterDuration}ms cubic-bezier(.23,1,.32,1) ${
          index * delayIncrement
        }ms both`,
      }}
    >
      {char}
    </span>
  );
});
export default memo(
  forwardRef(function AnimatedInputBar(props, ref) {
    return (
      <>
        <style>{motion}</style>
        <InputBar {...props} Character={Character} inputRef={ref} />
      </>
    );
  }),
);
