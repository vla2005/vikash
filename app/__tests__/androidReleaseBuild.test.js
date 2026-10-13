const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { configureBuildGradle } = require('../plugins/withAndroidReleaseApks');

// Usa o template do SDK instalado; mudanças no Expo não passam silenciosamente.
function expoBuildTemplate() {
  const archive = zlib.gunzipSync(
    fs.readFileSync(
      path.join(
        path.dirname(require.resolve('expo/package.json')),
        'template.tgz',
      ),
    ),
  );
  for (let offset = 0; offset + 512 <= archive.length; ) {
    const header = archive.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString().split('\0')[0];
    if (!name) {
      break;
    }
    const size =
      parseInt(
        header.subarray(124, 136).toString().replace(/\0/g, '').trim(),
        8,
      ) || 0;
    if (name.endsWith('/android/app/build.gradle')) {
      return archive.subarray(offset + 512, offset + 512 + size).toString();
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('Template Android não encontrado no SDK Expo instalado.');
}

function signingAssignments(source) {
  return [...source.matchAll(/signingConfig signingConfigs\.(\w+)/g)].map(
    match => match[1],
  );
}

test('prebuild preserva debug e assina release apenas com credenciais privadas', () => {
  const template = expoBuildTemplate();
  expect(signingAssignments(template)).toEqual(['debug', 'debug']);
  const generated = configureBuildGradle(template);
  expect(signingAssignments(generated)).toEqual(['debug', 'release']);
  expect(generated).toContain('validateReleaseSigning(releaseCredentials');
  expect(generated).toContain("startsWith('android.injected.signing.')");
  expect(generated).toContain('configurationCacheRequested');
  expect(generated).toContain('proguard-android-optimize.txt');
});

test('reaplicar o plugin não duplica assinatura, splits nem altera a configuração', () => {
  const once = configureBuildGradle(expoBuildTemplate());
  expect(configureBuildGradle(once)).toBe(once);
  expect(once.match(/def releaseCredentials/g)).toHaveLength(1);
});

test('checkout com política de assinatura já existente mantém suas validações', () => {
  const existing = fs.readFileSync(
    path.join(__dirname, '../android/app/build.gradle'),
    'utf8',
  );
  const generated = configureBuildGradle(existing);
  expect(signingAssignments(generated)).toEqual(['debug', 'release']);
  expect(
    generated.match(/validateReleaseSigning\(releaseCredentials/g),
  ).toHaveLength(1);
  expect(generated.match(/def releaseCredentials/g)).toHaveLength(1);
  expect(configureBuildGradle(generated)).toBe(generated);
});

test('template desconhecido e bloco incompleto falham sem gerar uma build insegura', () => {
  expect(() =>
    configureBuildGradle(
      'android { buildTypes { release { minifyEnabled true } } }',
    ),
  ).toThrow('assinatura desconhecido');
  const generated = configureBuildGradle(expoBuildTemplate());
  expect(() =>
    configureBuildGradle(
      generated.replace('// @generated end vikash-release-abi-splits', ''),
    ),
  ).toThrow('incompleto');
});

function runBuildGuard(storeFile, missingCredentials = false) {
  return spawnSync(
    process.execPath,
    [path.join(__dirname, '../scripts/build-android-apks.js')],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        VIKASH_RELEASE_STORE_FILE: storeFile,
        VIKASH_RELEASE_STORE_PASSWORD: missingCredentials
          ? ''
          : 'test-only-password',
        VIKASH_RELEASE_KEY_ALIAS: 'test-only-alias',
        VIKASH_RELEASE_KEY_PASSWORD: 'test-only-password',
      },
    },
  );
}

test('comando sem credenciais falha antes de executar prebuild', () => {
  const result = runBuildGuard('test-only.jks', true);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Configure as variáveis VIKASH_RELEASE_*');
  expect(result.stdout).toBe('');
});

test('chave dentro do Android gerado é protegida antes de recriar a pasta', () => {
  const buildFile = path.join(__dirname, '../android/app/build.gradle');
  const before = fs.readFileSync(buildFile, 'utf8');
  const result = runBuildGuard(
    path.join(__dirname, '../android/app/test-only-private.jks'),
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    'Guarde a chave de release fora da pasta android',
  );
  expect(result.stderr).not.toContain('test-only-password');
  expect(result.stdout).toBe('');
  expect(fs.readFileSync(buildFile, 'utf8')).toBe(before);
});

test('release oferece somente ARM64 e mantém debug sem splits obrigatórios', () => {
  const generated = configureBuildGradle(expoBuildTemplate());
  expect(generated).toContain("include 'arm64-v8a'");
  expect(generated).not.toContain('armeabi-v7a');
  expect(generated).toContain('enable vikashSplitReleaseApks');
  expect(generated).toContain("contains('release')");
});
