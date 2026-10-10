// Cada pessoa configura seu próprio projeto EAS, sem gravar dados pessoais no Git.
module.exports = ({ config }) => {
  const projectId = process.env.EAS_PROJECT_ID?.trim();
  if (!projectId) {
    return { ...config, updates: { enabled: false } };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('EAS_PROJECT_ID precisa ser o Project ID (UUID) do projeto Expo.');
  }
  return {
    ...config,
    runtimeVersion: { policy: 'fingerprint' },
    updates: {
      enabled: true,
      url: `https://u.expo.dev/${projectId}`,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      requestHeaders: { 'expo-channel-name': 'production' },
    },
    extra: { ...config.extra, eas: { projectId } },
  };
};
