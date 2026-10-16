import * as RN from 'react-native';
import { Skia } from '@shopify/react-native-skia';
import { requireOptionalNativeModule } from 'expo';
import capture, {
  getAssistantImageRevision,
} from '../src/services/assistantCapture.android';
const mockCapture = jest.fn();
jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => ({ capture: mockCapture })),
}));
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'fallback-png'),
}));
jest.mock('@shopify/react-native-skia', () => ({
  AlphaType: { Premul: 2 },
  ColorType: { RGBA_8888: 4 },
  makeImageFromView: jest.fn(),
  Skia: {
    Data: { fromBytes: jest.fn(), fromBase64: jest.fn() },
    Image: { MakeImage: jest.fn(), MakeImageFromEncoded: jest.fn() },
  },
}));
let data, image, pixels;
beforeEach(() => {
  jest.clearAllMocks();
  data = { dispose: jest.fn() };
  image = { dispose: jest.fn() };
  pixels = new Uint8Array(16);
  jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42);
  jest.spyOn(RN.PixelRatio, 'getPixelSizeForLayoutSize').mockReturnValue(2);
  Skia.Data.fromBytes.mockReturnValue(data);
  Skia.Data.fromBase64.mockReturnValue(data);
  Skia.Image.MakeImage.mockReturnValue(image);
  Skia.Image.MakeImageFromEncoded.mockReturnValue(image);
  mockCapture.mockResolvedValue({
    width: 2,
    height: 2,
    bytesPerRow: 8,
    pixels,
  });
  jest.spyOn(RN.TurboModuleRegistry, 'get').mockReturnValue({});
});
afterEach(() => jest.restoreAllMocks());
test('PixelCopy feeds bounded RGBA bytes directly to Skia without PNG or base64', async () => {
  const view = { current: {} };
  expect(await capture(view, null, { width: 2, height: 2 })).toBe(image);
  expect(requireOptionalNativeModule).toHaveBeenCalledWith('VikashCapture');
  expect(mockCapture).toHaveBeenCalledWith(42, 2, 2);
  expect(Skia.Data.fromBytes).toHaveBeenCalledWith(pixels);
  expect(Skia.Image.MakeImage).toHaveBeenCalledWith(
    { width: 2, height: 2, colorType: 4, alphaType: 2 },
    data,
    8,
  );
  expect(data.dispose).toHaveBeenCalledTimes(1);
  expect(Skia.Data.fromBase64).not.toHaveBeenCalled();
});
test('a PixelCopy rejection uses the installed capture fallback', async () => {
  mockCapture.mockRejectedValueOnce(new Error('window unavailable'));
  expect(await capture({ current: {} }, null, { width: 2, height: 2 })).toBe(
    image,
  );
  expect(Skia.Data.fromBase64).toHaveBeenCalledWith('fallback-png');
});
test('invalid native pixel metadata cannot be interpreted or crash the shader', async () => {
  mockCapture.mockResolvedValueOnce({
    width: 2,
    height: 2,
    bytesPerRow: 4,
    pixels,
  });
  await capture({ current: {} }, null, { width: 2, height: 2 });
  expect(Skia.Data.fromBytes).not.toHaveBeenCalled();
  expect(Skia.Data.fromBase64).toHaveBeenCalled();
});

test('a native revision stays associated with its image for safe cache reuse', async () => {
  mockCapture.mockResolvedValueOnce({
    width: 2,
    height: 2,
    bytesPerRow: 8,
    pixels,
    revision: 7,
  });
  const frame = await capture({ current: {} }, null, { width: 2, height: 2 });
  expect(getAssistantImageRevision(frame, 0)).toBe(7);
  expect(getAssistantImageRevision({}, 9)).toBe(9);
});
