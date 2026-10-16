import { createAssistantImageCache } from '../src/utils/assistantImageCache';

const image = () => ({ dispose: jest.fn() });
afterEach(() => jest.useRealTimers());
test('reopening reuses a filtered image while its cache owner retains it', () => {
  jest.useFakeTimers();
  const cache = createAssistantImageCache();
  const frame = image();
  cache.store('profile:home', cache.version(), frame);
  cache.release(frame);
  expect(frame.dispose).not.toHaveBeenCalled();
  expect(cache.acquire('profile:home')).toBe(frame);
  cache.release(frame);
  cache.invalidate();
  expect(frame.dispose).toHaveBeenCalledTimes(1);
});
test('invalidation cannot dispose the image while the open overlay still uses it', () => {
  jest.useFakeTimers();
  const cache = createAssistantImageCache(),
    frame = image();
  cache.store('a', cache.version(), frame);
  cache.invalidate();
  expect(cache.acquire('a')).toBeNull();
  expect(frame.dispose).not.toHaveBeenCalled();
  cache.release(frame);
  cache.release(frame);
  expect(frame.dispose).toHaveBeenCalledTimes(1);
});
test('data arriving during a capture prevents that image being retained for another opening', () => {
  const cache = createAssistantImageCache(),
    frame = image(),
    old = cache.version();
  cache.invalidate();
  cache.store('a', old, frame);
  expect(cache.acquire('a')).toBeNull();
  cache.release(frame);
  expect(frame.dispose).toHaveBeenCalledTimes(1);
});
test('profile, screen and layout keys cannot reuse another capture', () => {
  jest.useFakeTimers();
  const cache = createAssistantImageCache(),
    frame = image();
  cache.store('alice:home:390:844', cache.version(), frame);
  cache.release(frame);
  expect(cache.acquire('bob:home:390:844')).toBeNull();
  expect(frame.dispose).toHaveBeenCalledTimes(1);
});
test('expiry frees the cache but preserves a borrowed frame until close', () => {
  jest.useFakeTimers();
  const cache = createAssistantImageCache({ ttl: 30000 }),
    frame = image();
  cache.store('a', cache.version(), frame);
  jest.advanceTimersByTime(30000);
  expect(cache.acquire('a')).toBeNull();
  expect(frame.dispose).not.toHaveBeenCalled();
  cache.release(frame);
  expect(frame.dispose).toHaveBeenCalledTimes(1);
});
