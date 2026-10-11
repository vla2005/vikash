/* eslint-env browser */
const key = 'vikash.appearance';
export const readAppearance = async () => localStorage.getItem(key);
export const writeAppearance = async preference =>
  localStorage.setItem(key, preference);
