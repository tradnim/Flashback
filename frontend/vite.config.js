import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const historyEngineUrl = env.VITE_HISTORY_ENGINE_URL || 'http://localhost:3000';

  return {
    server: {
      proxy: {
        '/api': {
          target: historyEngineUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
