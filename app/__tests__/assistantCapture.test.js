import {NativeModules,PixelRatio,TurboModuleRegistry} from 'react-native';
import {Skia,makeImageFromView} from '@shopify/react-native-skia';
import {captureRef} from 'react-native-view-shot';
import captureAndroid from '../src/services/assistantCapture.android';
jest.mock('expo',()=>({requireOptionalNativeModule:jest.fn(()=>null)}));
import captureIOS from '../src/services/assistantCapture';

jest.mock('react-native-view-shot',()=>({captureRef:jest.fn()}));
jest.mock('@shopify/react-native-skia',()=>({makeImageFromView:jest.fn(),
  Skia:{Data:{fromBase64:jest.fn()},Image:{MakeImageFromEncoded:jest.fn()}},
}));
let data,image;
beforeEach(()=>{
  jest.clearAllMocks();data={dispose:jest.fn()};image={dispose:jest.fn()};
  Skia.Data.fromBase64.mockReturnValue(data);Skia.Image.MakeImageFromEncoded.mockReturnValue(image);
  captureRef.mockResolvedValue('lossless-png');makeImageFromView.mockResolvedValue(image);
  jest.spyOn(TurboModuleRegistry,'get').mockReturnValue({});
  jest.spyOn(PixelRatio,'getPixelSizeForLayoutSize').mockImplementation(size=>size*3);
});
afterEach(()=>jest.restoreAllMocks());
const layout={width:390,height:844};

test('Android transfers only a bounded lossless image in memory, then releases input data',async()=>{
  const view={current:{}},trace={mark:jest.fn()};
  expect(await captureAndroid(view,trace,layout)).toBe(image);
  expect(captureRef).toHaveBeenCalledWith(view,{format:'png',result:'base64',width:585,height:1266,handleGLSurfaceViewOnAndroid:true});
  expect(Skia.Data.fromBase64).toHaveBeenCalledWith('lossless-png');
  expect(Skia.Image.MakeImageFromEncoded).toHaveBeenCalledWith(data);
  expect(data.dispose).toHaveBeenCalledTimes(1);expect(image.dispose).not.toHaveBeenCalled();
  expect(makeImageFromView).not.toHaveBeenCalled();
});

test('capture respects its pixel budget and never upscales a low density screen',async()=>{
  await captureAndroid({},null,{width:900,height:1600});
  expect(captureRef.mock.calls[0][1]).toEqual(expect.objectContaining({width:720,height:1280}));
  PixelRatio.getPixelSizeForLayoutSize.mockImplementation(size=>size);
  await captureAndroid({},null,layout);
  expect(captureRef.mock.calls[1][1]).toEqual(expect.objectContaining({width:390,height:844}));
});

test('installed APKs without the module keep the original capture',async()=>{
  NativeModules.RNViewShot=undefined;TurboModuleRegistry.get.mockReturnValue(null);
  const view={current:{}};expect(await captureAndroid(view,null,layout)).toBe(image);
  expect(makeImageFromView).toHaveBeenCalledWith(view);expect(captureRef).not.toHaveBeenCalled();
});

test('failed captures and invalid PNGs cannot break the assistant or retain decoded input',async()=>{
  captureRef.mockRejectedValueOnce(new Error('native capture unavailable'));
  await captureAndroid({},null,layout);
  Skia.Image.MakeImageFromEncoded.mockReturnValueOnce(null);
  await captureAndroid({},null,layout);
  expect(makeImageFromView).toHaveBeenCalledTimes(2);expect(data.dispose).toHaveBeenCalledTimes(1);
});

test('iOS uses unchanged Skia capture and excludes the Android native dependency',async()=>{
  const view={current:{}};await captureIOS(view);
  expect(makeImageFromView).toHaveBeenCalledWith(view);expect(captureRef).not.toHaveBeenCalled();
  expect(require('../package.json').expo.autolinking.ios.exclude).toContain('react-native-view-shot');
});
