import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      cssCodeSplit: false,
      assetsInlineLimit: 100000,
    },
  },
});
