// One filtered image, bounded lifetime, explicit ownership across open/close.
export function createAssistantImageCache({
  ttl = 30000,
  now = Date.now,
} = {}) {
  let epoch = 0,
    current = null,
    timer = null;
  const images = new WeakMap(),
    disposed = new WeakSet();
  const dispose = image => {
    if (image && !disposed.has(image)) {
      disposed.add(image);
      image.dispose();
    }
  };
  const drop = record => {
    if (--record.refs === 0) {
      images.delete(record.image);
      dispose(record.image);
    }
  };
  const evict = () => {
    clearTimeout(timer);
    timer = null;
    if (current) {
      const old = current;
      current = null;
      drop(old);
    }
  };
  return {
    version: () => epoch,
    invalidate() {
      epoch++;
      evict();
    },
    acquire(key) {
      if (!current || current.key !== key || now() >= current.expires) {
        evict();
        return null;
      }
      current.refs++;
      return current.image;
    },
    store(key, version, image) {
      const record = { key, image, refs: 1, expires: now() + ttl };
      images.set(image, record);
      if (version === epoch) {
        evict();
        current = record;
        record.refs++;
        timer = setTimeout(evict, ttl);
      }
      return image;
    },
    release(image) {
      const record = images.get(image);
      if (record) drop(record);
      else dispose(image);
    },
  };
}
