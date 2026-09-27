import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const historyEngineUrl = env.VITE_HISTORY_ENGINE_URL || 'http://localhost:3000';
  const aiVoiceUrl = env.VITE_AI_VOICE_URL || 'http://127.0.0.1:8000';

  return {
    server: {
      proxy: {
        '/api/events': {
          target: historyEngineUrl,
          changeOrigin: true,
        },
        '/api/ask': {
          target: aiVoiceUrl,
          changeOrigin: true,
        },
        '/api/broadcast': {
          target: aiVoiceUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
