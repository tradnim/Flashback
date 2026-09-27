import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const historyEngineUrl = env.VITE_HISTORY_ENGINE_URL || 'http://127.0.0.1:3000';
  const aiVoiceUrl = env.VITE_AI_VOICE_URL || 'http://127.0.0.1:8000';

  return {
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/audio': { target: aiVoiceUrl, changeOrigin: true },
        '/api/history/': { target: historyEngineUrl, rewrite: path => path.replace('/api/history', '') },
        '/api/ai/': { target: aiVoiceUrl, rewrite: path => path.replace('/api/ai', '') },
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
