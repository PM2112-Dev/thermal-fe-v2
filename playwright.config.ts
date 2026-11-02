import { defineConfig, devices } from '@playwright/test'

// Test E2E chạy trên môi trường local: FE :5273, BE :5272. Mật khẩu lấy từ biến môi trường E2E_PASSWORD.
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['json', { outputFile: 'e2e/.results/results.json' }], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5273',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts|01-auth|23-permissions/,
    },
    { name: 'noauth', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testMatch: /23-permissions/ },
    { name: 'auth', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testMatch: /01-auth/ },
  ],
})
