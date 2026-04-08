import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/auth': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          },
          '/farmer': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          },
          '/advisory': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          },
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          },
          '/soil': {
            target: 'http://localhost:4000',
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.EXPO_PUBLIC_API_URL': JSON.stringify(env.EXPO_PUBLIC_API_URL || ''),
        'process.env.EXPO_PUBLIC_WEATHER_API_KEY': JSON.stringify(env.EXPO_PUBLIC_WEATHER_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
