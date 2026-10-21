const {
  withAndroidManifest,
  AndroidConfig,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
module.exports = function withVoiceEntryShortcut(config) {
  config = withAndroidManifest(config, result => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(
      result.modResults,
    );
    const metadata = activity['meta-data'] || [];
    activity['meta-data'] = [
      ...metadata.filter(
        item => item.$['android:name'] !== 'android.app.shortcuts',
      ),
      {
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/voice_entry_shortcuts',
        },
      },
    ];
    return result;
  });
  return withDangerousMod(config, [
    'android',
    async result => {
      const directory = path.join(
        result.modRequest.platformProjectRoot,
        'app/src/main/res/xml',
      );
      fs.mkdirSync(directory, { recursive: true });
      const pkg = result.android.package;
      if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(pkg))
        throw new Error('Android package inválido.');
      fs.writeFileSync(
        path.join(directory, 'voice_entry_shortcuts.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut android:shortcutId="voice-entry" android:enabled="true" android:icon="@drawable/ic_voice_entry"
    android:shortcutShortLabel="@string/voice_entry_shortcut_label">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="${pkg}" android:targetClass="${pkg}.VoiceEntryActivity" />
  </shortcut>
</shortcuts>`,
      );
      const kotlinDir = path.join(
        result.modRequest.platformProjectRoot,
        'app/src/main/java',
        ...pkg.split('.'),
      );
      fs.mkdirSync(kotlinDir, { recursive: true });
      const template = fs.readFileSync(
        path.join(__dirname, 'voice-entry/VoiceEntryActivity.kt'),
        'utf8',
      );
      fs.writeFileSync(
        path.join(kotlinDir, 'VoiceEntryActivity.kt'),
        template.replace('__APP_PACKAGE__', pkg),
      );
      const values = path.join(
        result.modRequest.platformProjectRoot,
        'app/src/main/res/values/voice_entry_shortcut.xml',
      );
      fs.writeFileSync(
        values,
        '<resources><string name="voice_entry_shortcut_label">Registrar por voz</string></resources>',
      );
      return result;
    },
  ]);
};
