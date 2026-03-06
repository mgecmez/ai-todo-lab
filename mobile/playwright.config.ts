import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 40_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    // Backend http://localhost:5100 varsayılır (API_BASE_URL config.ts ile sabitlenmiş)
  },

  // Expo Web sunucusunu otomatik başlatır; zaten çalışıyorsa yeniden başlatmaz.
  webServer: {
    command: 'CI=1 npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
