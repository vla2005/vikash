import {
  findNodeHandle,
  NativeModules,
  PixelRatio,
  TurboModuleRegistry,
} from 'react-native';
import {
  AlphaType,
  ColorType,
  makeImageFromView,
  Skia,
} from '@shopify/react-native-skia';

let windowCapture;
const imageRevisions = new WeakMap();
function getWindowCapture() {
  if (windowCapture === undefined) {
    const { requireOptionalNativeModule } = require('expo');
    windowCapture = requireOptionalNativeModule('VikashCapture');
  }
  return windowCapture;
}
export function getAssistantSourceRevision() {
  return getWindowCapture()?.getRevision?.() ?? 0;
}
export function getAssistantImageRevision(image, fallback) {
  return imageRevisions.get(image) ?? fallback;
}
export function warmupAssistantCapture(view) {
  const module = getWindowCapture();
  if (module?.observe && view?.current) {
    const tag = findNodeHandle(view.current);
    if (tag) module.observe(tag).catch(() => {});
  }
  if (NativeModules.RNViewShot || TurboModuleRegistry.get('RNViewShot'))
    require('react-native-view-shot');
}

export default async function captureAssistantBackground(view, trace, layout) {
  const width = Math.min(
    PixelRatio.getPixelSizeForLayoutSize(layout.width),
    Math.ceil(layout.width * 1.5),
    720,
  );
  const height = Math.max(
    1,
    Math.round((layout.height * width) / layout.width),
  );
  const windowModule = getWindowCapture();
  if (windowModule) {
    try {
      trace?.mark('capture-pixelcopy-start');
      const tag = findNodeHandle(view.current);
      if (!tag) throw new Error('Assistant capture target unavailable');
      const result = await windowModule.capture(tag, width, height);
      trace?.mark('capture-pixelcopy-ready');
      if (
        result.width !== width ||
        result.height !== height ||
        result.bytesPerRow < width * 4 ||
        !(result.pixels instanceof Uint8Array) ||
        result.pixels.length < result.bytesPerRow * height
      )
        throw new Error('Invalid native bitmap');
      const data = Skia.Data.fromBytes(result.pixels);
      try {
        const image = Skia.Image.MakeImage(
          {
            width,
            height,
            colorType: ColorType.RGBA_8888,
            alphaType: AlphaType.Premul,
          },
          data,
          result.bytesPerRow,
        );
        if (!image) throw new Error('Assistant bitmap unavailable');
        if (Number.isFinite(result.revision))
          imageRevisions.set(image, result.revision);
        return image;
      } finally {
        data.dispose();
      }
    } catch {
      trace?.mark('capture-pixelcopy-fallback');
    }
  }
  const native =
    NativeModules.RNViewShot || TurboModuleRegistry.get('RNViewShot');
  if (native) {
    try {
      trace?.mark('capture-native-draw');
      const { captureRef } = require('react-native-view-shot');
      // PNG is lossless; shrink before the bridge, not after transferring all
      // screen pixels. Keep the same pixel density as the blurred Skia buffer.
      const encoded = await captureRef(view, {
        format: 'png',
        result: 'base64',
        width,
        height,
        handleGLSurfaceViewOnAndroid: true,
      });
      trace?.mark('capture-encoded-ready');
      const data = Skia.Data.fromBase64(encoded);
      try {
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) throw new Error('Assistant bitmap unavailable');
        return image;
      } finally {
        data.dispose();
      }
    } catch {
      trace?.mark('capture-legacy-fallback');
    }
  } else trace?.mark('capture-module-unavailable');
  return makeImageFromView(view);
}
