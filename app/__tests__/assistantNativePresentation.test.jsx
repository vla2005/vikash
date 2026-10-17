import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Keyboard, KeyboardAvoidingView, PixelRatio, Platform, StyleSheet, TextInput, View } from 'react-native';
import AssistantExperience from '../src/components/assistant/AssistantExperience';
import * as Reanimated from 'react-native-reanimated';
import AssistantDockMotion from '../src/components/assistant/AssistantDockMotion';
import { EntryLayout } from '../src/components/assistant/AssistantEntryLayout.shared';
import AssistantIntro from '../src/components/assistant/AssistantIntro';
import { makeImageFromView, Skia } from '@shopify/react-native-skia';

jest.unmock('../src/components/assistant/AssistantIntelligence');
jest.mock('../src/services/assistantCaptureCache',()=>require('../src/services/assistantCaptureCache.android'));

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top:24, bottom:20, left:0, right:0 }) }));
jest.mock('../src/components/Icon', () => 'Icon');
jest.mock('../src/config/api', () => ({ API_BASE_URL:'http://api.test' }));
jest.mock('../src/shared/components/reacticx/base/animated-input-bar', () => {
  const ReactModule = require('react');
  const { TextInput: Input } = require('react-native');
  return ReactModule.forwardRef(function InputMock(props, ref) {
    ReactModule.useImperativeHandle(ref, () => mockInput);
    return <Input {...props} />;
  });
});
const mockApplyConfig = jest.fn();
const mockFocus = jest.fn();
const mockBlur = jest.fn();
const mockMeasure = jest.fn();
const mockInput = { focus:mockFocus, blur:mockBlur, measureInWindow:mockMeasure };
const mockController = { loading:false, conversations:[], currentId:null, draft:'', attachments:[],
  setDraft:jest.fn(), send:jest.fn(), startNew:jest.fn(), pick:jest.fn() };
jest.mock('../src/hooks/useAssistant', () => () => mockController);
jest.mock('../src/shared/components/reacticx/organisms/apple-intelligence/conf', () => ({ getSiriShader:jest.fn(() => ({})) }));
jest.mock('../src/shared/components/reacticx/organisms/apple-intelligence/use-siri-uniforms', () => {
  const ReactModule = require('react');
  return { useSiriUniforms: () => ReactModule.useRef({
    iTime:{ set:jest.fn() }, intensity:{ set:jest.fn() }, uniforms:{},
    applyConfig:mockApplyConfig, frameCallback:{ setActive:jest.fn() },
  }).current };
});
jest.mock('@shopify/react-native-skia', () => {
  const { View: Box } = require('react-native');
  return { Canvas:Box, ColorShader:Box, Fill:Box, Shader:Box, ImageShader:Box, makeImageFromView:jest.fn(),
    Skia:{ Surface:{ Make:jest.fn(() => null), MakeOffscreen:jest.fn(() => null) } }, TileMode:{ Clamp:0 } };
});
let renderer, listeners;
const keyboard = async (event, screenY) => act(async () => {
  for (const listener of listeners.get(event) || []) listener({ duration:0, endCoordinates:{ screenY, screenX:0, width:390, height:844-screenY } });
});
const viewport = async (width, height) => act(async () => {
  renderer.root.findByProps({ testID:'assistant-native-viewport' }).props.onLayout({ nativeEvent:{ layout:{ x:0, y:0, width, height } } });
});
const areaLayout = async height => act(async () => {
  await renderer.root.findByType(KeyboardAvoidingView).instance._onLayout({ persist() {}, nativeEvent:{ layout:{ x:0, y:0, width:390, height } } });
});
const props = { visible:true, profileId:'profile', accessToken:'test', onClose:jest.fn() };
async function show({flightLayout=true}={}) {
  await act(async () => renderer.root.findByProps({testID:'assistant-presentation'}).props.onShow());
  await viewport(390,844);
  await act(async () => renderer.root.findByProps({testID:'assistant-entry-layout'}).props.onLayout({nativeEvent:{layout:{width:390,height:740}}}));
  await act(async () => renderer.root.findByProps({testID:'assistant-entry-field'}).props.onLayout({nativeEvent:{layout:{x:0,y:550,width:390,height:190}}}));
  await act(async()=>jest.advanceTimersByTime(110));
  const flight=renderer.root.findAllByProps({testID:'assistant-open-flight'})[0];
  if(flightLayout && flight)await act(async()=>flight.props.onLayout?.({nativeEvent:{layout:{width:280,height:44}}}));
  await act(async()=>jest.advanceTimersByTime(20));
}
async function mount(extra) {
  await act(async () => { renderer = TestRenderer.create(<AssistantExperience {...props} {...extra}><View testID="underlying-app" /></AssistantExperience>); });
  const target = renderer.root.findByProps({ testID:'assistant-capture-target' });
  await act(async () => target.props.onLayout({ nativeEvent:{ layout:{ width:390, height:844 } } }));
}
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockController.loading = false; mockController.draft = '';
  jest.spyOn(PixelRatio,'getFontScale').mockReturnValue(1);
  mockMeasure.mockImplementation(callback => callback(20, 600, 280, 80));
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  makeImageFromView.mockReturnValue(new Promise(() => {}));
  Skia.Surface.MakeOffscreen.mockReturnValue(null);Skia.Surface.Make.mockReturnValue(null);
  listeners = new Map();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
    return { remove:() => listeners.get(event).delete(listener) };
  });
});
afterEach(async () => { await act(async () => renderer?.unmount()); renderer = null; jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(['android', 'ios'])('%s presents a native modal and focuses the shared input even if the snapshot never finishes', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  await mount();
  const modal = renderer.root.findByProps({ testID:'assistant-presentation' });
  expect(modal.props.transparent).toBe(true);
  expect(modal.props.presentationStyle).toBe('overFullScreen');
  expect(modal.props.hardwareAccelerated).toBe(platform === 'android');
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(mockFocus).not.toHaveBeenCalled();
  if (platform === 'android') expect(StyleSheet.flatten(renderer.root.findByProps({testID:'assistant-morph-content'}).props.style).opacity).toBe(0);
  await show();
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
  await act(async () => jest.advanceTimersByTime(500));
  expect(makeImageFromView).toHaveBeenCalledTimes(1);
  expect(mockFocus).toHaveBeenCalledTimes(1);
  await act(async () => modal.props.onRequestClose());
  await act(async () => jest.advanceTimersByTime(110));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('history loading and a rejected snapshot cannot leave the native composer unfocused', async () => {
  makeImageFromView.mockRejectedValue(new Error('snapshot unavailable'));
  mockController.loading = true;
  await mount();
  await show();
  await act(async () => jest.advanceTimersByTime(500));
  expect(mockFocus).not.toHaveBeenCalled();
  mockController.loading = false;
  await act(async () => renderer.update(<AssistantExperience {...props}><View testID="underlying-app" /></AssistantExperience>));
  await act(async () => jest.advanceTimersByTime(500));
  expect(mockFocus).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
  expect(makeImageFromView).toHaveBeenCalledTimes(1);
});

test('closing before native presentation cancels focus and discards a late snapshot', async () => {
  let finish;
  makeImageFromView.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => jest.advanceTimersByTime(50));
  await act(async () => renderer.update(<AssistantExperience {...props} visible={false}><View testID="underlying-app" /></AssistantExperience>));
  const image = { dispose:jest.fn() };
  await act(async () => { finish(image); jest.advanceTimersByTime(1000); });
  expect(mockFocus).not.toHaveBeenCalled();
  expect(image.dispose).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByProps({ testID:'assistant-presentation' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID:'underlying-app' }).length).toBeGreaterThan(0);
});


test('the effect lives inside the native modal, outside the captured app, even before a snapshot exists', async () => {
  await mount();
  await show();
  await act(async () => jest.advanceTimersByTime(50));
  const modal = renderer.root.findByProps({ testID:'assistant-presentation' });
  expect(modal.findAllByProps({ testID:'assistant-effect-canvas' }).length).toBeGreaterThan(0);
  expect(modal.findAllByProps({ testID:'assistant-blur-fallback' }).length).toBeGreaterThan(0);
  const capture = renderer.root.findByProps({ testID:'assistant-capture-target' });
  expect(capture.findAllByProps({ testID:'assistant-effect-canvas' })).toHaveLength(0);
  expect(capture.findAllByType(TextInput)).toHaveLength(0);
});

test.each(['android', 'ios'])('%s keeps a bounded viewport, safe area and composer above the keyboard', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  await mount();
  await show();
  await viewport(390, 844);
  const frame = () => StyleSheet.flatten(renderer.root.findByProps({ testID:'assistant-native-frame' }).props.style);
  expect(frame()).toEqual(expect.objectContaining({ width:390, height:844 }));
  await areaLayout(844);
  await keyboard(platform === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 500);
  await keyboard('keyboardDidShow', 500);
  const area = renderer.root.findByType(KeyboardAvoidingView);
  expect(area.instance.state.bottom).toBe(344);
  expect(StyleSheet.flatten(renderer.root.findByProps({ testID:'assistant-safe-content' }).props.style))
    .toEqual(expect.objectContaining({ paddingTop:24, paddingBottom:8 }));
  if (platform === 'android') {
    // Keep a full modal canvas; only KeyboardAvoidingView applies the keyboard inset.
    await viewport(390, 500); await areaLayout(844);
    expect(frame().height).toBe(844);
    expect(area.instance.state.bottom).toBe(344);
  }
  await keyboard(platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', 844);
  await keyboard('keyboardDidHide', 844);
  await viewport(390, 844); await areaLayout(844);
  expect(area.instance.state.bottom).toBe(0);
  expect(frame().height).toBe(844);
});

test('a successful blurred capture uses a bounded raster image and removes live blur', async () => {
  const portable = { dispose:jest.fn() };
  const filtered = { dispose:jest.fn(), makeNonTextureImage:jest.fn(() => portable) };
  const raw = { width:() => 1170, height:() => 2532, dispose:jest.fn() };
  const drawImageRect = jest.fn();
  const surface = { getCanvas:() => ({ drawImageRect }), flush:jest.fn(), makeImageSnapshot:() => filtered, dispose:jest.fn() };
  Skia.Surface.MakeOffscreen.mockReturnValue(surface);
  Skia.Paint = () => ({ setImageFilter:jest.fn() });
  Skia.ImageFilter = { MakeBlur:jest.fn() };
  makeImageFromView.mockResolvedValue(raw);
  await mount();
  await show();
  await act(async () => jest.advanceTimersByTime(50));
  expect(Skia.Surface.MakeOffscreen).toHaveBeenCalledWith(585, 1266);
  expect(drawImageRect).toHaveBeenCalledTimes(1);
  expect(filtered.makeNonTextureImage).toHaveBeenCalledTimes(1);
  expect(raw.dispose).toHaveBeenCalledTimes(1);
  expect(filtered.dispose).toHaveBeenCalledTimes(1);
  expect(surface.dispose).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByProps({ testID:'assistant-blur-fallback' })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ testID:'assistant-effect-canvas' }).length).toBeGreaterThan(0);
  await act(async () => renderer.update(<AssistantExperience {...props} visible={false}><View /></AssistantExperience>));
  expect(portable.dispose).toHaveBeenCalledTimes(1);
});


test('native viewport, effect and content are pinned layers rather than consecutive full-height blocks', async () => {
  expect(StyleSheet.absoluteFillObject).toBeUndefined();
  await mount();
  await show();
  await act(async () => jest.advanceTimersByTime(50));
  for (const testID of ['assistant-native-viewport', 'assistant-native-effect', 'assistant-overlay']) {
    const layer = renderer.root.findByProps({ testID });
    expect(StyleSheet.flatten(layer.props.style)).toEqual(expect.objectContaining({
      position:'absolute', top:0, bottom:0, left:0, right:0,
    }));
  }
});


test.each(['android', 'ios'])('%s dismisses the keyboard outside the field, preserves typing/cursor touches inside, and keeps button presses usable', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  let completeOpen;
  jest.spyOn(Reanimated,'withTiming').mockImplementation((value,config,callback)=>{if(config?.duration===680 && callback){completeOpen=callback;return 0;}callback?.(true);return value;});
  mockController.draft = 'Texto já digitado';
  await mount();
  await show();
  const capture = renderer.root.findByType(KeyboardAvoidingView).props.onStartShouldSetResponderCapture;
  // Numeric native tags must be checked against field bounds, not ref equality.
  await act(async () => {
    expect(capture({ target:42, nativeEvent:{ pageX:80, pageY:630 } })).toBe(false);
  });
  expect(Keyboard.dismiss).not.toHaveBeenCalled();
  expect(mockBlur).not.toHaveBeenCalled();
  await act(async () => capture({ target:mockInput }));
  expect(Keyboard.dismiss).not.toHaveBeenCalled();
  await act(async () => {
    expect(capture({ target:75, nativeEvent:{ pageX:10, pageY:250 } })).toBe(false);
  });
  expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  expect(mockBlur).toHaveBeenCalledTimes(1);
  expect(mockController.draft).toBe('Texto já digitado');
  // The pending initial focus must not reopen the keyboard after an outside tap.
  await act(async () => {completeOpen(true);jest.advanceTimersByTime(500);});
  expect(mockFocus).not.toHaveBeenCalled();
  await act(async () => renderer.root.findAll(node => node.props.accessibilityLabel === 'Selecionar imagens' && node.props.onPress)[0].props.onPress());
  expect(mockController.pick).toHaveBeenCalledWith('images');
});

test('an old outside-touch measurement cannot blur the input after a more recent inside tap', async () => {
  await mount();
  await show();
  const pending = [];
  mockMeasure.mockImplementation(callback => pending.push(callback));
  const capture = renderer.root.findByType(KeyboardAvoidingView).props.onStartShouldSetResponderCapture;
  await act(async () => capture({ target:75, nativeEvent:{ pageX:10, pageY:250 } }));
  await act(async () => capture({ target:42, nativeEvent:{ pageX:80, pageY:630 } }));
  await act(async () => { pending[1](20,600,280,80); pending[0](20,600,280,80); });
  expect(Keyboard.dismiss).not.toHaveBeenCalled();
  expect(mockBlur).not.toHaveBeenCalled();
});


test.each(['android', 'ios'])('%s keeps the welcome copy mounted at the same size while the keyboard is open', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  await mount();
  await show();
  expect(renderer.root.findByType(AssistantIntro).props.compact).toBe(false);
  await keyboard('keyboardDidShow', 500);
  expect(renderer.root.findByType(AssistantIntro).props.compact).toBe(false);
  const copy = renderer.root.findByProps({ testID:'assistant-intro-copy' });
  expect(StyleSheet.flatten(copy.props.style).display).not.toBe('none');
  expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
  await keyboard('keyboardDidHide', 844);
  expect(renderer.root.findByType(AssistantIntro).props.compact).toBe(false);
});

test('closing waits for the return animation, ignores repeated closes and cancels autofocus', async () => {
  let complete,completeOpen;
  jest.spyOn(Reanimated, 'withTiming').mockImplementation((value, config, callback) => {
    if (config?.duration === 680 && callback) {completeOpen=callback;return 0;}
    if (config?.duration === 560) { complete = callback; return 0; }
    callback?.(true); return value;
  });
  await mount({ dockOrigin:{x:16,y:700,width:300,height:44} });
  await show();
  const close = renderer.root.findByProps({ testID:'assistant-presentation' }).props.onRequestClose;
  await act(async () => { close(); close(); });
  await act(async () => jest.advanceTimersByTime(110));
  expect(complete).toEqual(expect.any(Function));
  expect(props.onClose).not.toHaveBeenCalled();
  expect(renderer.root.findAllByProps({ testID:'assistant-return-flight' }).length).toBeGreaterThan(0);
  await act(async () => {completeOpen(true);jest.advanceTimersByTime(500);});
  expect(mockFocus).not.toHaveBeenCalled();
  await act(async () => { complete(false); });
  expect(props.onClose).not.toHaveBeenCalled();
  await act(async () => { complete(true); complete(true); });
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test.each(['android','ios'])('%s expands from the dock before focusing and revealing the real composer', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  let completeOpen;
  jest.spyOn(Reanimated, 'withTiming').mockImplementation((value, config, callback) => {
    if (config?.duration === 680 && callback) { completeOpen=callback; return 0; }
    callback?.(true); return value;
  });
  await mount({dockOrigin:{x:16,y:700,width:280,height:44}});
  await show();
  await act(async () => jest.advanceTimersByTime(110));
  const motion=renderer.root.findByType(AssistantDockMotion);
  expect(motion.props.transition).toEqual(expect.objectContaining({direction:'open',from:expect.objectContaining({width:280,height:44})}));
  expect(renderer.root.findAllByProps({testID:'assistant-open-flight'}).length).toBeGreaterThan(0);
  expect(mockFocus).not.toHaveBeenCalled();
  expect(props.onClose).not.toHaveBeenCalled();
  await act(async () => completeOpen(false));
  expect(mockFocus).not.toHaveBeenCalled();
  await act(async () => completeOpen(true));
  expect(mockFocus).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(AssistantDockMotion).props.opening).toBe(false);
  expect(renderer.root.findAllByProps({testID:'assistant-open-flight'})).toHaveLength(0);
});

test('closing during expansion cancels focus and late opening completion cannot close the assistant', async () => {
  let completeOpen,completeClose;
  jest.spyOn(Reanimated,'withTiming').mockImplementation((value,config,callback) => {
    if (config?.duration === 680 && callback) {completeOpen=callback; return 0;}
    if (config?.duration === 560) {completeClose=callback; return 0;}
    callback?.(true); return value;
  });
  await mount();
  await show();
  await act(async () => jest.advanceTimersByTime(110));
  await act(async () => {renderer.root.findByProps({testID:'assistant-presentation'}).props.onRequestClose();});
  await act(async () => jest.advanceTimersByTime(110));
  await act(async () => completeOpen(true));
  expect(mockFocus).not.toHaveBeenCalled();
  expect(props.onClose).not.toHaveBeenCalled();
  await act(async () => completeClose(true));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test.each(['android','ios'])('%s keeps the dock until native flight layout and never resets the revealed body to zero', async platform => {
  jest.replaceProperty(Platform,'OS',platform);
  let finish;
  jest.spyOn(Reanimated,'withTiming').mockImplementation((value,config,callback) => {
    if (config?.duration===680 && callback) {finish=callback;return 1;}
    callback?.(true);return value;
  });
  const covered=jest.fn();
  await mount({onDockCovered:covered});
  expect(covered).not.toHaveBeenCalled();
  await show({flightLayout:false});
  await act(async()=>jest.advanceTimersByTime(110));
  expect(covered).not.toHaveBeenCalled();
  await act(async()=>renderer.root.findByProps({testID:'assistant-open-flight'}).props.onLayout({nativeEvent:{layout:{width:300,height:44}}}));
  expect(covered).toHaveBeenCalledTimes(1);
  await act(async()=>finish(true));
  expect(StyleSheet.flatten(renderer.root.findByProps({testID:'assistant-morph-content'}).props.style).opacity).toBe(1);
});

test.each(['android','ios'])('%s moves the input toward the stationary greeting on focus, without a second compact animation', async platform => {
  jest.replaceProperty(Platform,'OS',platform);
  await mount();await show();await act(async()=>jest.advanceTimersByTime(110));
  const model=()=>renderer.root.findByType(EntryLayout).props.model;
  const anchor=model().introTop, rest=model().target;
  await act(async()=>renderer.root.findByType(TextInput).props.onFocus());
  const focused=model().target;
  expect(focused).toBeLessThan(rest);
  expect(model().introTop).toBe(anchor);
  await keyboard('keyboardDidShow',500);
  await act(async()=>renderer.root.findByProps({testID:'assistant-entry-layout'}).props.onLayout({nativeEvent:{layout:{width:390,height:408}}}));
  expect(model().target).toBe(focused);
  expect(model().introTop).toBe(anchor);
  expect(renderer.root.findByType(AssistantIntro).props.compact).toBe(false);
  await act(async()=>renderer.root.findByProps({testID:'assistant-entry-layout'}).props.onLayout({nativeEvent:{layout:{width:390,height:280}}}));
  expect(model().target+190).toBeLessThanOrEqual(280);
  expect(model().introTop).toBe(anchor);
});

test('native closing refreshes the dock anchor after its collapsed geometry has settled', async () => {
  const getDockOrigin=jest.fn(async()=>({x:16,y:740,width:260,height:44}));
  let complete;
  jest.spyOn(Reanimated,'withTiming').mockImplementation((value,config,callback)=>{
    if (config?.duration===560) {complete=callback;return value;}
    callback?.(true);return value;
  });
  await mount({dockOrigin:{x:16,y:700,width:300,height:44},getDockOrigin});
  await show();await act(async()=>jest.advanceTimersByTime(110));
  await act(async()=>renderer.root.findByProps({testID:'assistant-presentation'}).props.onRequestClose());
  await act(async()=>jest.advanceTimersByTime(110));
  expect(getDockOrigin).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType(AssistantDockMotion).props.transition.to).toEqual({x:16,y:740,width:260,height:44});
  await act(async()=>complete(true));
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test.each(['android','ios'])('%s preserves placeholder behavior while Android avoids startup character worklets', async platform => {
  jest.replaceProperty(Platform,'OS',platform);
  await mount();
  if (platform === 'android') expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  await show();await act(async()=>jest.advanceTimersByTime(110));
  expect(renderer.root.findByType(TextInput).props.animatePlaceholder).toBe(platform !== 'android');
  await act(async()=>renderer.root.findByType(TextInput).props.onFocus());
  expect(renderer.root.findByType(TextInput).props.animatePlaceholder).toBe(true);
  await act(async()=>renderer.root.findByType(TextInput).props.onBlur());
  expect(renderer.root.findByType(TextInput).props.animatePlaceholder).toBe(true);
});


test('Android skips invisible live blur and uses a portable raster without GPU readback', async () => {
  jest.replaceProperty(Platform,'OS','android');
  const raw={width:()=>720,height:()=>1600,dispose:jest.fn()};
  const filtered={dispose:jest.fn(),makeNonTextureImage:jest.fn()};
  const surface={getCanvas:()=>({drawImageRect:jest.fn()}),flush:jest.fn(),makeImageSnapshot:()=>filtered,dispose:jest.fn()};
  Skia.Surface.Make.mockReturnValue(surface);
  Skia.Paint=()=>({setImageFilter:jest.fn()});Skia.ImageFilter={MakeBlur:jest.fn()};
  let resolve;makeImageFromView.mockReturnValue(new Promise(done=>{resolve=done;}));
  await mount();
  expect(renderer.root.findAllByProps({testID:'assistant-blur-fallback'})).toHaveLength(0);
  await show();await act(async()=>jest.advanceTimersByTime(110));
  expect(renderer.root.findAllByProps({testID:'assistant-blur-fallback'}).length).toBeGreaterThan(0);
  await act(async()=>resolve(raw));
  expect(Skia.Surface.Make).toHaveBeenCalledWith(585,1300);
  expect(Skia.Surface.MakeOffscreen).not.toHaveBeenCalled();
  expect(filtered.makeNonTextureImage).not.toHaveBeenCalled();
  expect(filtered.dispose).not.toHaveBeenCalled();
  expect(raw.dispose).toHaveBeenCalledTimes(1);expect(surface.dispose).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByProps({testID:'assistant-blur-fallback'})).toHaveLength(0);
  await act(async()=>renderer.update(<AssistantExperience {...props} visible={false}><View /></AssistantExperience>));
  expect(filtered.dispose).not.toHaveBeenCalled();
  await act(async()=>jest.advanceTimersByTime(30000));
  expect(filtered.dispose).toHaveBeenCalledTimes(1);
});



test('Android reopening reuses the filtered image; a source touch forces a fresh capture',async()=>{
  jest.replaceProperty(Platform,'OS','android');
  const raw={width:()=>720,height:()=>1600,dispose:jest.fn()};
  const filtered={dispose:jest.fn()};
  const surface={getCanvas:()=>({drawImageRect:jest.fn()}),flush:jest.fn(),makeImageSnapshot:()=>filtered,dispose:jest.fn()};
  Skia.Surface.Make.mockReturnValue(surface);Skia.Paint=()=>({setImageFilter:jest.fn()});Skia.ImageFilter={MakeBlur:jest.fn()};
  makeImageFromView.mockResolvedValue(raw);
  const extra={captureScope:'profile:home:dark'};
  const update=async visible=>act(async()=>renderer.update(<AssistantExperience {...props} {...extra} visible={visible}><View /></AssistantExperience>));
  await mount(extra);await show();await act(async()=>jest.advanceTimersByTime(110));
  expect(makeImageFromView).toHaveBeenCalledTimes(1);
  await update(false);expect(filtered.dispose).not.toHaveBeenCalled();
  await update(true);await show();await act(async()=>jest.advanceTimersByTime(110));
  expect(makeImageFromView).toHaveBeenCalledTimes(1);expect(Skia.Surface.Make).toHaveBeenCalledTimes(1);
  await update(false);
  await act(async()=>renderer.root.findByProps({testID:'assistant-capture-target'}).props.onTouchStart({nativeEvent:{timestamp:100}}));
  expect(filtered.dispose).toHaveBeenCalledTimes(1);
  // A new image from the next native capture has independent ownership.
  surface.makeImageSnapshot=()=>({dispose:jest.fn()});
  await update(true);await show();await act(async()=>jest.advanceTimersByTime(110));
  expect(makeImageFromView).toHaveBeenCalledTimes(2);
});


test('Android mounts the input and greeting after the first morph layout, while keeping focus until expansion ends',async()=>{
  jest.replaceProperty(Platform,'OS','android');
  let complete;
  jest.spyOn(Reanimated,'withTiming').mockImplementation((value,config,callback)=>{
    if(config?.duration===680 && callback){complete=callback;return 0;}
    callback?.(true);return value;
  });
  await mount();
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(renderer.root.findAllByType(AssistantIntro)).toHaveLength(0);
  expect(renderer.root.findAllByProps({testID:'assistant-effect-canvas'})).toHaveLength(0);
  expect(makeImageFromView).not.toHaveBeenCalled();
  await show({flightLayout:false});
  expect(renderer.root.findAllByProps({testID:'assistant-open-flight'}).length).toBeGreaterThan(0);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  await act(async()=>renderer.root.findByProps({testID:'assistant-open-flight'}).props.onLayout({nativeEvent:{layout:{width:280,height:44}}}));
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
  expect(renderer.root.findAllByType(AssistantIntro)).toHaveLength(1);
  expect(mockFocus).not.toHaveBeenCalled();
  await act(async()=>complete(true));
  expect(mockFocus).toHaveBeenCalledTimes(1);
});

test('Android preserves the full measured composer when reopening an existing draft',async()=>{
  jest.replaceProperty(Platform,'OS','android');mockController.draft='Minha pergunta';
  await mount();
  expect(renderer.root.findAllByProps({testID:'assistant-composer-shell'})).toHaveLength(0);
  expect(renderer.root.findByType(TextInput).props.value).toBe('Minha pergunta');
});

test('Android cancelled before presentation never mounts the input or starts a capture',async()=>{
  jest.replaceProperty(Platform,'OS','android');await mount();
  await act(async()=>renderer.update(<AssistantExperience {...props} visible={false}><View /></AssistantExperience>));
  await act(async()=>jest.advanceTimersByTime(1000));
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(makeImageFromView).not.toHaveBeenCalled();
  expect(mockFocus).not.toHaveBeenCalled();
});


test('Android uses the real measured composer for enlarged system fonts',async()=>{
  jest.replaceProperty(Platform,'OS','android');
  jest.spyOn(PixelRatio,'getFontScale').mockReturnValue(1.6);
  await mount();
  expect(renderer.root.findAllByProps({testID:'assistant-composer-shell'})).toHaveLength(0);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
});

test('Android prepares shader uniforms while idle and does not resend them on opening',async()=>{
  jest.replaceProperty(Platform,'OS','android');
  const previousIdle=global.requestIdleCallback,previousCancel=global.cancelIdleCallback;
  let idle;
  global.requestIdleCallback=callback=>{idle=callback;return 1;};global.cancelIdleCallback=jest.fn();
  try{
    await mount();expect(mockApplyConfig).not.toHaveBeenCalled();
    await act(async()=>idle());expect(mockApplyConfig).toHaveBeenCalledTimes(1);
    await show();expect(mockApplyConfig).toHaveBeenCalledTimes(1);
  }finally{
    await act(async()=>renderer.unmount());renderer=null;
    global.requestIdleCallback=previousIdle;global.cancelIdleCallback=previousCancel;
  }
});


test.each(['android', 'ios'])('%s removes the composer on entering history without retaining character exits or losing the draft', async platform => {
  jest.replaceProperty(Platform, 'OS', platform);
  mockController.draft = 'Compare meus gastos';
  await mount();
  await show();
  const input = renderer.root.findByType(TextInput);
  expect(input.props.value).toBe('Compare meus gastos');
  const exitBoundary = renderer.root.findByType(Reanimated.LayoutAnimationConfig);
  expect(exitBoundary.props.skipExiting).toBe(true);
  expect(exitBoundary.props.skipEntering).toBeUndefined();
  expect(exitBoundary.findByProps({ testID:'assistant-composer' }).props.collapsable).toBe(false);

  const press = label => renderer.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress();
  await act(async () => press('Histórico de conversas'));
  expect(Keyboard.dismiss).toHaveBeenCalled();
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(renderer.root.findAllByType(Reanimated.LayoutAnimationConfig)).toHaveLength(0);
  expect(renderer.root.findAllByProps({ children:'As perguntas enviadas são salvas na sua conta.' }).length).toBeGreaterThan(0);
  const focuses = mockFocus.mock.calls.length;
  await act(async () => jest.advanceTimersByTime(1000));
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
  expect(mockFocus).toHaveBeenCalledTimes(focuses);

  await act(async () => press('Voltar à conversa'));
  expect(renderer.root.findByType(TextInput).props.value).toBe('Compare meus gastos');
});
