let snapshot = null;
const subscribers = new Set();
export const getSharedOnboarding = () => snapshot;
export function subscribeOnboarding(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
export function publishOnboarding(value) {
  snapshot = value;
  subscribers.forEach(listener => listener());
}
