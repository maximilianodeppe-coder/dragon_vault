import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/auth-browser', workers: 1, timeout: 60000,
  use: { baseURL: process.env.APP_ORIGIN || 'http://127.0.0.1:3107', channel: process.platform === 'win32' ? 'chrome' : undefined, headless: true, reducedMotion: 'reduce', screenshot: 'only-on-failure' },
});
