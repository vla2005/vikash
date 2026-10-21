const listeners = new Set();
export function subscribeFinancialChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notifyFinancialChange() {
  listeners.forEach(listener => listener());
}
