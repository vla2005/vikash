const fs = require('node:fs/promises');
const path = require('node:path');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('expo/config-plugins');

const splitStart = '// @generated begin vikash-release-abi-splits';
const splitEnd = '// @generated end vikash-release-abi-splits';
const splitBlock = `
${splitStart}
// Release somente ARM64; debug mantém o suporte a emuladores.
def vikashSplitReleaseApks = gradle.startParameter.taskNames.any {
    it.toLowerCase(java.util.Locale.ROOT).contains('release')
}
android {
    splits {
        abi {
            enable vikashSplitReleaseApks
            reset()
            include 'arm64-v8a'
            universalApk false
        }
    }
}
${splitEnd}
`;

const signingHeader = `apply from: 'release-signing-policy.gradle'
def releaseCredentials = [
    storeFile: System.getenv('VIKASH_RELEASE_STORE_FILE') ? file(System.getenv('VIKASH_RELEASE_STORE_FILE')) : null,
    storePassword: System.getenv('VIKASH_RELEASE_STORE_PASSWORD'),
    keyAlias: System.getenv('VIKASH_RELEASE_KEY_ALIAS'),
    keyPassword: System.getenv('VIKASH_RELEASE_KEY_PASSWORD')
]
android {
    signingConfigs {
        release {
            storeFile releaseCredentials.storeFile
            storePassword releaseCredentials.storePassword
            keyAlias releaseCredentials.keyAlias
            keyPassword releaseCredentials.keyPassword
        }
    }
}

`;

const signingGate = `
// A política existente também vale para projetos recriados pelo Expo.
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.project == project && it.name.toLowerCase(java.util.Locale.ROOT).contains('release') }) {
        if (project.properties.keySet().any { it.toString().startsWith('android.injected.signing.') }) {
            throw new GradleException('Use VIKASH_RELEASE_* para assinar release; android.injected.signing.* não é permitido.')
        }
        if (gradle.startParameter.configurationCacheRequested) {
            throw new GradleException('Execute a build de release com --no-configuration-cache para validar a assinatura em cada execução.')
        }
        validateReleaseSigning(releaseCredentials, file('debug.keystore'))
    }
}
`;

function configureBuildGradle(source) {
  let contents = source
    .replace(
      /def enableProguardInReleaseBuilds = false/,
      "def enableProguardInReleaseBuilds = (findProperty('android.enableMinifyInReleaseBuilds') ?: false).toBoolean()",
    )
    .replace(/proguard-android\.txt/g, 'proguard-android-optimize.txt');

  if (!contents.includes('shrinkResources ')) {
    contents = contents.replace(
      /(release\s*\{[\s\S]*?)(minifyEnabled[^\n]*)/,
      "$1shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: false).toBoolean()\n            $2",
    );
  }
  if (!contents.includes("apply from: 'release-signing-policy.gradle'")) {
    if (
      !/^android\s*\{/m.test(contents) ||
      !/release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/.test(contents)
    ) {
      throw new Error(
        'Template Android de assinatura desconhecido; confira antes de gerar release.',
      );
    }
    contents = contents.replace(
      /(release\s*\{[\s\S]*?signingConfig signingConfigs\.)debug/,
      '$1release',
    );
    contents = contents.replace(/^android\s*\{/m, signingHeader + 'android {');
    contents += signingGate;
  }
  if (
    !contents.includes('minifyEnabled ') ||
    !contents.includes('shrinkResources ')
  ) {
    throw new Error('Template Android não contém as opções R8 esperadas.');
  }
  const begin = contents.indexOf(splitStart);
  if (begin !== -1) {
    const end = contents.indexOf(splitEnd, begin);
    if (end === -1) {
      throw new Error('Bloco de APKs por arquitetura incompleto.');
    }
    contents = contents.slice(0, begin) + contents.slice(end + splitEnd.length);
  }
  return contents.trimEnd() + '\n' + splitBlock;
}

function withAndroidReleaseApks(config) {
  config = withGradleProperties(config, mod => {
    // O lint nativo e o R8 compartilham a JVM; 512 MB de metaspace não bastam nesta build.
    const jvm = mod.modResults.find(
      item => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    if (jvm) {
      jvm.value = jvm.value.replace(
        /-XX:MaxMetaspaceSize=512m/gi,
        '-XX:MaxMetaspaceSize=1536m',
      );
    }
    return mod;
  });
  config = withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('O plugin de APKs do Vikash exige build.gradle Groovy.');
    }
    mod.modResults.contents = configureBuildGradle(mod.modResults.contents);
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async mod => {
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        'app/release-signing-policy.gradle',
      );
      await fs.copyFile(
        path.join(__dirname, 'release-signing-policy.gradle'),
        target,
      );
      return mod;
    },
  ]);
}

module.exports = withAndroidReleaseApks;
module.exports.configureBuildGradle = configureBuildGradle;
