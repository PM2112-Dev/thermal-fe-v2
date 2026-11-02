import { test as setup, expect } from '@playwright/test'

setup('đăng nhập admin', async ({ page }) => {
  const pass = process.env.E2E_PASSWORD
  if (!pass) throw new Error('Thiếu biến môi trường E2E_PASSWORD')
  await page.goto('/login')
  await page.locator('input[type="text"], input:not([type])').first().fill(process.env.E2E_USER ?? 'admin')
  await page.locator('input[type="password"]').first().fill(pass)
  await page.locator('button').filter({ hasText: /đăng nhập|login/i }).first().click()
  await expect(page).not.toHaveURL(/login/)
  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
