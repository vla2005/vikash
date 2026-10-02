import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'EXPO_PUBLIC_']);
  return {
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react-native-svg$/, replacement: fileURLToPath(new URL('./src/web/svg.jsx', import.meta.url)) },
      { find: /^react-native-safe-area-context$/, replacement: fileURLToPath(new URL('./src/web/safeArea.jsx', import.meta.url)) },
    ],
    extensions: ['.web.jsx', '.web.js', '.web.tsx', '.web.ts', '.mjs', '.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(mode !== 'production'),
    'process.env.EXPO_PUBLIC_API_URL': JSON.stringify(env.VITE_API_URL || env.EXPO_PUBLIC_API_URL || ''),
  },
  server: { port: 5173, strictPort: true },
  };
});
