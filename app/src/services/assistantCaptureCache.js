// iOS/web keep the existing behavior: no image retained between openings.
export const captureCache = {
  version: () => 0,
  acquire: () => null,
  store: (_key, _version, image) => image,
  release: image => image?.dispose(),
  invalidate: () => {},
};
export const invalidateAssistantCapture = () => {};
export const markAssistantCaptureTrigger = () => {};
export const onAssistantSourceTouch = () => {};
export const trackAssistantResponse = response => response;
