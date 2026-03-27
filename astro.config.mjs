import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://2sg.io',
  integrations: [
    tailwind(),
  ],
});