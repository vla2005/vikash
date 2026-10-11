const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_IGNORE_PATHS } = require('expo/fingerprint');
const { createFingerprintFromSourcesAsync } = require('@expo/fingerprint/build/hash/Hash');
const { buildPathMatchObjects, buildDirMatchObjects } = require('@expo/fingerprint/build/utils/Path');
const config = require('../fingerprint.config');

const testDirectory = path.resolve('.jest-temp');
const pluginPath = 'node_modules/expo-updates/expo-updates-gradle-plugin';
let fixture;

function writeFile(relativePath, contents) {
  const destination = path.join(fixture, pluginPath, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, contents);
}

async function fingerprint() {
  const ignorePathMatchObjects = buildPathMatchObjects([...DEFAULT_IGNORE_PATHS, ...config.ignorePaths]);
  return createFingerprintFromSourcesAsync([{ type: 'dir', filePath: pluginPath, reasons: ['expoAutolinkingAndroid'] }], fixture, {
    hashAlgorithm: 'sha1', concurrentIoLimit: 4,
    ignorePathMatchObjects, ignoreDirMatchObjects: buildDirMatchObjects(ignorePathMatchObjects),
  });
}

beforeEach(() => {
  fs.mkdirSync(testDirectory, { recursive: true });
  fixture = fs.mkdtempSync(path.join(testDirectory, 'ota-fingerprint-'));
  writeFile('src/main/kotlin/Plugin.kt', 'class Plugin { val version = 1 }');
});

afterEach(() => {
  if (!path.resolve(fixture).startsWith(`${testDirectory}${path.sep}`)) {
    throw new Error('A pasta temporária precisa ficar dentro de .jest-temp.');
  }
  fs.rmSync(fixture, { recursive: true, force: true });
});

test('a compilação e seus caches não mudam a compatibilidade entre APK e OTA', async () => {
  const clean = await fingerprint();
  writeFile('.kotlin/sessions/compiler-session.salive', 'primeira compilação');
  writeFile('.gradle/9.3.1/fileHashes/fileHashes.bin', 'cache do Gradle');
  writeFile('build/classes/kotlin/main/Plugin.class', 'bytecode compilado');
  expect((await fingerprint()).hash).toBe(clean.hash);
  writeFile('.kotlin/sessions/compiler-session.salive', 'outra compilação');
  expect((await fingerprint()).hash).toBe(clean.hash);
});

test('alterar o código nativo do plugin ainda exige uma nova build', async () => {
  const previous = await fingerprint();
  writeFile('src/main/kotlin/Plugin.kt', 'class Plugin { val version = 2 }');
  expect((await fingerprint()).hash).not.toBe(previous.hash);
});
