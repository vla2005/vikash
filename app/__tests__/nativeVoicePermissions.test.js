const { execFileSync } = require('node:child_process');
const path = require('node:path');

// Executa os plugins reais fora dos mocks React Native/Jest, sem escrever nas
// pastas nativas. app.json sozinho nao revela conflitos entre plugins.
let generated;
beforeAll(() => {
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  const output = execFileSync(process.execPath, [
    path.join(expoRoot, 'bin/cli'), 'config', '--type', 'introspect', '--json',
  ], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, EXPO_NO_DOTENV: '1', EAS_PROJECT_ID: '' },
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
  generated = JSON.parse(output)._internal.modResults;
}, 35000);

test('Android gerado declara RECORD_AUDIO sem bloqueio do seletor de imagens', () => {
  const permissions = generated.android.manifest.manifest['uses-permission'];
  const microphone = permissions.filter(entry => entry.$['android:name'] === 'android.permission.RECORD_AUDIO');
  expect(microphone).toHaveLength(1);
  expect(microphone[0].$['tools:node']).not.toBe('remove');
  expect(microphone[0].$['android:maxSdkVersion']).toBeUndefined();
});

test.each(['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription'])(
  'iOS gerado preserva %s mesmo com o plugin de anexos', key => {
    expect(generated.ios.infoPlist[key]).toEqual(expect.any(String));
    expect(generated.ios.infoPlist[key].trim().length).toBeGreaterThan(0);
  },
);
