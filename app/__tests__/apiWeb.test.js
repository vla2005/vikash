jest.mock('expo/virtual/env', () => ({ env: process.env }));

const originalUrl = process.env.EXPO_PUBLIC_API_URL;

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
  jest.resetModules();
});

test('configuracao web funciona sem import.meta.env', () => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.resetModules();
  expect(require('../src/config/api.web').API_BASE_URL).toBe('http://localhost:8080');
});

test('configuracao web usa URL publica do Expo sem barra final', () => {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
  jest.resetModules();
  expect(require('../src/config/api.web').API_BASE_URL).toBe('https://api.example.com');
});
