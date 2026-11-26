import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://localhost:5199', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'bureau', testMatch: 'bureau.spec.ts', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: 'mobile.spec.ts', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: `node -e "require('fs').rmSync('e2e/e2e.db', { force: true })" && node --env-file=.env server/index.ts`,
      url: 'http://localhost:3100/api/sante',
      env: { PORT: '3100', TURSO_DATABASE_URL: 'file:e2e/e2e.db', TURSO_AUTH_TOKEN: '' },
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      env: { API_URL: 'http://localhost:3100' },
      reuseExistingServer: false,
    },
  ],
});
