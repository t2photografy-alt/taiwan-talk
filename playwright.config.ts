import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const useExternalServer = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 1,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    ...devices['Pixel 5'],
    baseURL,
    channel: 'chrome',
    viewport: { width: 390, height: 880 },
    trace: 'on-first-retry',
  },
  ...(useExternalServer
    ? {}
    : {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 5173',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 30_000,
        },
      }),
});
