import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    paths: { base: process.env.BASE_PATH ?? '' },
    adapter: adapter({
      fallback: undefined
    }),
    prerender: {
      entries: ['*']
    }
  }
};

export default config;
