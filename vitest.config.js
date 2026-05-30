import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

// 測試用設定（與 vue-cli/webpack 的建置設定獨立，僅 vitest 使用）。
// 提供 @ → src 別名（對齊 jsconfig.json），SFC 以 @vitejs/plugin-vue 解析，
// 環境用 jsdom 以支援未來的元件掛載測試。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs}'],
    globals: true,
  },
});
