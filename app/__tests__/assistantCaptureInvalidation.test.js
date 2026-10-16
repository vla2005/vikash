import {
  captureCache,
  invalidateAssistantCapture,
  markAssistantCaptureTrigger,
  onAssistantSourceTouch,
  trackAssistantResponse,
} from '../src/services/assistantCaptureCache.android';
afterEach(() => {
  captureCache.invalidate();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('normal touches invalidate cached values but the assistant trigger preserves them', () => {
  jest.useFakeTimers();
  const image = { dispose: jest.fn() };
  captureCache.store('a', captureCache.version(), image);
  captureCache.release(image);
  const event = { nativeEvent: { timestamp: 100 } };
  markAssistantCaptureTrigger(event);
  onAssistantSourceTouch(event);
  expect(captureCache.acquire('a')).toBe(image);
  captureCache.release(image);
  onAssistantSourceTouch({ nativeEvent: { timestamp: 101 } });
  expect(captureCache.acquire('a')).toBeNull();
  expect(image.dispose).toHaveBeenCalledTimes(1);
});
test('API arrival and completed parsing both invalidate without changing JSON data', async () => {
  const start = captureCache.version();
  const response = { json: jest.fn(async () => ({ balance: 10 })) };
  expect(trackAssistantResponse(response)).toBe(response);
  expect(captureCache.version()).toBeGreaterThan(start);
  const before = captureCache.version();
  expect(await response.json()).toEqual({ balance: 10 });
  expect(captureCache.version()).toBeGreaterThan(before);
});
test('clearing a profile invalidates in-flight capture generations', () => {
  const before = captureCache.version();
  invalidateAssistantCapture();
  expect(captureCache.version()).toBeGreaterThan(before);
});
