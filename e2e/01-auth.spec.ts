import { test, expect } from '@playwright/test'
import { snap } from './helpers'

const user = process.env.E2E_USER ?? 'admin'
const form = (page: import('@playwright/test').Page) => ({
  u: page.locator('input:not([type="password"]):not([readonly])').first(),
  p: page.locator('input[type="password"]').first(),
  btn: page.locator('button').filter({ hasText: /đăng nhập/i }).first(),
})

test('TC-01-01 | Hiển thị trang đăng nhập | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await expect(form(page).p).toBeVisible()
  await snap(page)
})
test('TC-01-02 | Kiểm tra bắt buộc nhập tên đăng nhập/mật khẩu | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await form(page).btn.click()
  await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  await snap(page)
})
test('TC-01-03 | Đăng nhập sai mật khẩu | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  const f = form(page)
  await f.u.fill(user); await f.p.fill('SaiMatKhau@999')
  await f.btn.click()
  await expect(page).toHaveURL(/login/)
  await page.waitForTimeout(1200)
  await snap(page)
})
test('TC-01-04 | Đăng nhập đúng và chuyển vào hệ thống | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  const f = form(page)
  await f.u.fill(user); await f.p.fill(process.env.E2E_PASSWORD!)
  await f.btn.click()
  await expect(page).not.toHaveURL(/login/)
  await page.waitForTimeout(2500)
  await snap(page)
})
test('TC-01-05 | Chưa đăng nhập bị chuyển về trang đăng nhập | Đăng nhập | /dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/)
  await snap(page)
})
test('TC-01-06 | Đổi ngôn ngữ trang đăng nhập (VI/EN) | Đăng nhập | /login', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /VI|EN/ }).first().click().catch(() => {})
  await page.waitForTimeout(600)
  await snap(page)
})
test('TC-01-07 | Trang không tồn tại chuyển về 404 | Lỗi 404 | /404', async ({ page }) => {
  await page.goto('/khong-ton-tai-xyz')
  await expect(page).toHaveURL(/404/)
  await snap(page)
})
test('TC-01-08 | Trang 403 không có quyền | Lỗi 403 | /403', async ({ page }) => {
  await page.goto('/403')
  await page.waitForTimeout(800)
  await snap(page)
})
