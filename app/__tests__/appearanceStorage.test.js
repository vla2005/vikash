import {
  readAppearance,
  writeAppearance,
} from '../src/services/appearanceStorage';
import {
  readAppearance as readWeb,
  writeAppearance as writeWeb,
} from '../src/services/appearanceStorage.web';
import * as SecureStore from 'expo-secure-store';

test('preferência nativa usa chave própria, sem substituir sessões de perfis', async () => {
  SecureStore.setItemAsync.mockClear();
  SecureStore.getItemAsync.mockResolvedValue('dark');
  await writeAppearance('dark');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'vikash.appearance',
    'dark',
  );
  expect(await readAppearance()).toBe('dark');
  expect(SecureStore.getItemAsync).toHaveBeenCalledWith('vikash.appearance');
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
});

test('preferência web persiste entre aberturas, em localStorage independente de sessões', async () => {
  const storage = new Map();
  const previousStorage = global.localStorage;
  global.localStorage = {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  };
  try {
    expect(await readWeb()).toBeNull();
    await writeWeb('dark');
    expect(await readWeb()).toBe('dark');
    expect([...storage.keys()]).toEqual(['vikash.appearance']);
    await writeWeb('system');
    expect(await readWeb()).toBe('system');
  } finally {
    global.localStorage = previousStorage;
  }
});
