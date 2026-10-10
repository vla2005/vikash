const { SourceSkips } = require('expo/fingerprint');

module.exports = {
  // As builds recriam essas pastas com prebuild; a fonte é o app.json e seus plugins.
  // Inclui também os caminhos relativos ao Git, pois o app fica numa subpasta.
  ignorePaths: ['android/**/*', 'ios/**/*', 'app/android/**/*', 'app/ios/**/*'],
  // O número da build muda a cada APK, sem mudar a compatibilidade do JavaScript.
  // SourceSkips é uma máscara de bits definida pelo Expo.
  // eslint-disable-next-line no-bitwise
  sourceSkips: SourceSkips.ExpoConfigVersions | SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun,
};
