const configure = require('../app.config');

const projectId = '12345678-1234-1234-1234-123456789abc';
const originalProjectId = process.env.EAS_PROJECT_ID;
afterEach(() => {
  if (originalProjectId === undefined) {
    delete process.env.EAS_PROJECT_ID;
  } else {
    process.env.EAS_PROJECT_ID = originalProjectId;
  }
});

test('quem baixa o repositório público não recebe atualizações de um projeto pessoal', () => {
  delete process.env.EAS_PROJECT_ID;
  const result = configure({
    config: { name: 'Vikash', plugins: ['expo-secure-store'] },
  });
  expect(result.updates).toEqual({ enabled: false });
  expect(result.extra?.eas).toBeUndefined();
  expect(result.runtimeVersion).toBeUndefined();
  expect(result.plugins).toEqual(['expo-secure-store']);
});

test('projeto configurado baixa no início e aplica na próxima abertura, preservando configuração do app', () => {
  process.env.EAS_PROJECT_ID = projectId;
  const result = configure({
    config: {
      name: 'Vikash',
      extra: { example: true },
      android: { package: 'com.vikash' },
    },
  });
  expect(result.updates).toEqual({
    enabled: true,
    url: `https://u.expo.dev/${projectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    requestHeaders: { 'expo-channel-name': 'production' },
  });
  expect(result.runtimeVersion).toEqual({ policy: 'fingerprint' });
  expect(result.extra).toEqual({ example: true, eas: { projectId } });
  expect(result.android.package).toBe('com.vikash');
});

test('Project ID inválido interrompe a configuração', () => {
  process.env.EAS_PROJECT_ID = 'nome-do-projeto';
  expect(() => configure({ config: {} })).toThrow('Project ID (UUID)');
});

test('validação da build pode fornecer ambiente explícito sem depender do processo', () => {
  delete process.env.EAS_PROJECT_ID;
  const result = configure(
    { config: { name: 'Vikash' } },
    { EAS_PROJECT_ID: projectId },
  );
  expect(result.updates.enabled).toBe(true);
  expect(result.updates.url).toBe('https://u.expo.dev/' + projectId);
  expect(result.runtimeVersion).toEqual({ policy: 'fingerprint' });
  expect(process.env.EAS_PROJECT_ID).toBeUndefined();
});
