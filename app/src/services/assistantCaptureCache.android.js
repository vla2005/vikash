import { createAssistantImageCache } from '../utils/assistantImageCache';
export const captureCache = createAssistantImageCache();
export const invalidateAssistantCapture = () => captureCache.invalidate();
const triggers = new WeakSet();
export function markAssistantCaptureTrigger(event) {
  if (event?.nativeEvent) triggers.add(event.nativeEvent);
}
export function onAssistantSourceTouch(event) {
  if (event?.nativeEvent && triggers.has(event.nativeEvent)) {
    triggers.delete(event.nativeEvent);
    return;
  }
  invalidateAssistantCapture();
}
export function trackAssistantResponse(response) {
  invalidateAssistantCapture();
  if (typeof response?.json === 'function') {
    const parse = response.json.bind(response);
    response.json = async (...args) => {
      try {
        return await parse(...args);
      } finally {
        invalidateAssistantCapture();
      }
    };
  }
  return response;
}
