const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const architectures = ['arm64-v8a'];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

function main() {
  for (const name of [
    'VIKASH_RELEASE_STORE_FILE',
    'VIKASH_RELEASE_STORE_PASSWORD',
    'VIKASH_RELEASE_KEY_ALIAS',
    'VIKASH_RELEASE_KEY_PASSWORD',
  ]) {
    if (!process.env[name] || !process.env[name].trim()) {
      throw new Error(
        'Configure as variáveis VIKASH_RELEASE_* conforme android/RELEASE_SIGNING.md.',
      );
    }
  }
  const storePath = path.resolve(root, process.env.VIKASH_RELEASE_STORE_FILE);
  const relativeStore = path.relative(path.join(root, 'android'), storePath);
  if (
    !relativeStore.startsWith('..' + path.sep) &&
    relativeStore !== '..' &&
    !path.isAbsolute(relativeStore)
  ) {
    throw new Error(
      'Guarde a chave de release fora da pasta android antes de executar prebuild.',
    );
  }
  process.env.VIKASH_RELEASE_STORE_FILE = storePath;
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  run(
    process.execPath,
    [
      path.join(expoRoot, 'bin/cli'),
      'prebuild',
      '--platform',
      'android',
      '--no-install',
    ],
    root,
  );
  const androidRoot = path.join(root, 'android');
  const gradleArgs = [
    ':app:assembleRelease',
    '--no-daemon',
    '--no-configuration-cache',
    '-PreactNativeArchitectures=' + architectures.join(','),
  ];
  if (process.platform === 'win32') {
    // Argumentos fixos; cmd executa o wrapper .bat sem shell:true no Node.
    run(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', 'gradlew.bat ' + gradleArgs.join(' ')],
      androidRoot,
    );
  } else {
    run('./gradlew', gradleArgs, androidRoot);
  }

  const apkRoot = path.join(androidRoot, 'app/build/outputs/apk/release');
  const metadata = JSON.parse(
    fs.readFileSync(path.join(apkRoot, 'output-metadata.json'), 'utf8'),
  );
  if (metadata.elements.length !== architectures.length) {
    throw new Error('A build não gerou exatamente um APK ARM64.');
  }
  const apks = architectures.map(architecture => {
    const matches = metadata.elements.filter(element =>
      element.filters.some(
        filter => filter.filterType === 'ABI' && filter.value === architecture,
      ),
    );
    if (matches.length !== 1) {
      throw new Error('APK ausente ou ambíguo para ' + architecture);
    }
    return { architecture, source: path.join(apkRoot, matches[0].outputFile) };
  });
  const mappingSource = path.join(
    androidRoot,
    'app/build/outputs/mapping/release/mapping.txt',
  );
  if (!fs.statSync(mappingSource).isFile()) {
    throw new Error('Mapping R8 não foi gerado.');
  }
  const destination = path.join(root, 'build/android-apks');
  fs.mkdirSync(destination, { recursive: true });
  for (const { architecture, source } of apks) {
    const output = path.join(
      destination,
      'vikash-' + architecture + '-release.apk',
    );
    fs.copyFileSync(source, output);
    console.log(
      path.relative(root, output) +
        ': ' +
        (fs.statSync(output).size / 1e6).toFixed(1) +
        ' MB',
    );
  }
  fs.copyFileSync(mappingSource, path.join(destination, 'mapping.txt'));
  const obsolete32BitApk = path.join(
    destination,
    'vikash-armeabi-v7a-release.apk',
  );
  if (fs.existsSync(obsolete32BitApk)) {
    fs.unlinkSync(obsolete32BitApk);
  }
  console.log(
    'Guarde o mapping.txt desta build para interpretar stack traces com R8.',
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
