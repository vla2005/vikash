/* eslint-env jest */
// O armazenamento nativo precisa de um aparelho. Cada teste pode substituir este mock.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(async () => {}),
}));
// O loop decorativo é executado pela UI nativa, fora do renderer de testes.
jest.mock('./src/components/silver/AmbientLight', () => 'AmbientLight');
jest.mock('./src/components/silver/GlassReflection', () => 'GlassReflection');
jest.mock('./src/components/silver/DockShade', () => 'DockShade');
jest.mock('./src/components/ListeningOrb', () => 'ListeningOrb');
jest.mock('./src/components/ListeningWave', () => 'ListeningWave');
jest.mock('./src/components/VoiceMicPulse', () => 'VoiceMicPulse');
// Testes verificam as interações; o motor UI e os materiais nativos são simulados.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, ScrollView, Easing } = require('react-native');
  const createAnimatedComponent = Component => React.forwardRef((props, ref) =>
    React.createElement(Component, { ...props, ...props.animatedProps, ref }));
  return {
    __esModule: true,
    default: { View, ScrollView, createAnimatedComponent },
    createAnimatedComponent,
    LayoutAnimationConfig: ({ children }) => children,
    useAnimatedProps: props => props(),
    useDerivedValue: updater => ({ get: updater, get value() { return updater(); } }),
    withDelay: (_, value) => value,
    useSharedValue: initial => {
      const ref = React.useRef();
      if (!ref.current) {
        let value = initial;
        ref.current = {
          get value() { return value; },
          set value(next) { value = next; },
          get: () => value,
          set: next => {
            value = typeof next === 'function' ? next(value) : next;
          },
        };
      }
      return ref.current;
    },
    useAnimatedStyle: style => style(),
    useAnimatedScrollHandler: handler => event =>
      handler(event.nativeEvent || event),
    useAnimatedReaction: () => {},
    withSpring: value => value,
    withRepeat: value => value,
    withTiming: (value, config, callback) => { callback?.(true); return value; },
    cancelAnimation: jest.fn(),
    ReduceMotion: { System: 'system', Never: 'never' },
    ReducedMotionConfig: () => null,
    Easing,
    cubicBezier: () => value => value,
  };
});
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (action, ...args) => action(...args),
}));
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: View,
    BlurTargetView: React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref }),
    ),
  };
});
jest.mock('expo-glass-effect', () => ({
  GlassView: require('react-native').View,
  isLiquidGlassAvailable: jest.fn(() => true),
  isGlassEffectAPIAvailable: jest.fn(() => true),
}));
jest.mock('@react-native-masked-view/masked-view', () => ({
  __esModule: true,
  default: require('react-native').View,
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: require('react-native').View,
  Path: require('react-native').View,
}));

// Seletores e arquivos exigem o SO; os testes do assistente simulam suas fronteiras.
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted:true })),
  launchCameraAsync: jest.fn(async () => ({ canceled:true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled:true })),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync:jest.fn(async () => ({ canceled:true })) }));
jest.mock('expo-file-system', () => ({
  File: class {}, Directory: class {}, Paths:{ document:'file://documents' },
}));
jest.mock('./src/components/assistant/AssistantIntelligence', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function AssistantIntelligenceMock({ children, renderOverlay }) { return React.createElement(View, null, children, renderOverlay?.(null)); };
});
jest.mock('./src/config/assistantEndpoint', () => ({ assistantEndpoint:'' }));
