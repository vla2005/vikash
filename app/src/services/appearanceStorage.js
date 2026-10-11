import { readValue, writeValue } from './secureStorage';

const key = 'vikash.appearance';
export const readAppearance = () => readValue(key);
export const writeAppearance = preference => writeValue(key, preference);
