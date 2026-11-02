import { test, expect } from '@playwright/test'
import { snap } from './helpers'
import { PASSWORD } from './helpers/api'

test('TC-01-20 | Đăng nhập bằng phím Enter | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input:not([type="password"]):not([readonly])').first().fill('admin')
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('input[type="password"]').first().press('Enter')
  await expect(page).not.toHaveURL(/login/)
  await snap(page)
})

test('TC-01-21 | Ô mật khẩu được che (type=password) | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await snap(page)
})

test('TC-01-22 | Tên đăng nhập/mật khẩu quá ngắn bị báo lỗi kiểm tra | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input:not([type="password"]):not([readonly])').first().fill('ab')
  await page.locator('input[type="password"]').first().fill('12345')
  await page.locator('button').filter({ hasText: /đăng nhập/i }).first().click()
  await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  await expect(page).toHaveURL(/login/)
  await snap(page)
})

test('TC-01-23 | Truy cập trang cần đăng nhập rồi đăng nhập xong quay lại đúng trang đã mở | Đăng nhập | /category/area', async ({ page }) => {
  await page.goto('/category/area')
  await expect(page).toHaveURL(/login/)
  await page.locator('input:not([type="password"]):not([readonly])').first().fill('admin')
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button').filter({ hasText: /đăng nhập/i }).first().click()
  await page.waitForTimeout(2500)
  await expect(page).toHaveURL(/category\/area/)
  await snap(page)
})
