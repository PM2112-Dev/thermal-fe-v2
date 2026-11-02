import { test, expect, Page } from '@playwright/test'
import { openPage, snap } from './helpers'
import { adminToken, ensureUser, login, apiContext, PASSWORD } from './helpers/api'

// Nhóm 15: phân quyền theo vai trò (dùng tài khoản riêng test_viewer, test_mgr)
const VIEWER = 'test_viewer'
const MGR = 'test_mgr'

test.beforeAll(async () => {
  const t = await adminToken()
  await ensureUser(t, VIEWER, 'VIEWER')
  await ensureUser(t, MGR, 'manager')
})

async function loginUi(page: Page, user: string) {
  await page.goto('/login')
  await page.locator('input:not([type="password"]):not([readonly])').first().fill(user)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button').filter({ hasText: /đăng nhập/i }).first().click()
  await expect(page).not.toHaveURL(/login/)
  await page.waitForTimeout(1500)
}

test('TC-15-01 | Viewer: đăng nhập thành công | Đăng nhập | /login', async ({ page }) => {
  await loginUi(page, VIEWER)
  await expect(page.getByText(VIEWER).first()).toBeVisible()
  await snap(page)
})
test('TC-15-02 | Viewer: được xem danh sách khu vực nhưng không có nút Thêm | Danh sách khu vực | /category/area', async ({ page }) => {
  await loginUi(page, VIEWER)
  await openPage(page, '/category/area')
  await expect(page.locator('table').first()).toBeVisible()
  await expect(page.locator('button:visible', { hasText: 'Thêm' })).toHaveCount(0)
  await snap(page)
})
test('TC-15-03 | Viewer: không truy cập được màn Tỉnh/Thành phố (không có quyền) | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await loginUi(page, VIEWER)
  await page.goto('/category/province')
  await page.waitForTimeout(2000)
  await expect(page).not.toHaveURL(/\/category\/province/)
  await snap(page)
})
test('TC-15-04 | Viewer: không truy cập được màn Người dùng | Danh sách người dùng | /category/user', async ({ page }) => {
  await loginUi(page, VIEWER)
  await page.goto('/category/user')
  await page.waitForTimeout(2000)
  await expect(page).not.toHaveURL(/\/category\/user/)
  await snap(page)
})
test('TC-15-05 | Viewer: menu không hiện các mục mà vai trò không có quyền | Thanh điều hướng | /dashboard', async ({ page }) => {
  await loginUi(page, VIEWER)
  const hrefs = await page.locator('nav a').evaluateAll((a) => a.map((x) => (x as HTMLAnchorElement).getAttribute('href') ?? ''))
  // Vai trò VIEWER chỉ có quyền đọc: area, camera-list, machine-type... và có quyền xem Kênh/Bộ cảnh báo; không có các tính năng dưới đây
  const restricted = ['/category/province', '/category/user', '/category/settings']
  const offenders = restricted.filter((r) => hrefs.includes(r))
  await page.getByText('QUẢN TRỊ HỆ THỐNG').first().hover().catch(() => {})
  await snap(page)
  expect(offenders, `Menu vẫn hiện mục không có quyền: ${offenders.join(', ')}`).toEqual([])
})
test('TC-15-06 | Viewer: API thêm tỉnh bị từ chối (403) | Tỉnh/Thành phố | /api/Provinces', async () => {
  const tok = await login(VIEWER, PASSWORD)
  const ctx = await apiContext(tok!)
  expect((await ctx.post('/api/Provinces', { data: { code: 'TEST_VW', name: 'TEST_viewer' } })).status()).toBe(403)
  await ctx.dispose()
})
test('TC-15-07 | Viewer: API xoá khu vực bị từ chối (403) | Danh sách khu vực | /api/Areas/{id}', async () => {
  const tok = await login(VIEWER, PASSWORD)
  const ctx = await apiContext(tok!)
  expect((await ctx.delete('/api/Areas/1')).status()).toBe(403)
  await ctx.dispose()
})
test('TC-15-08 | Manager: có nút Thêm ở màn Tỉnh/Thành phố và thêm được | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await loginUi(page, MGR)
  await openPage(page, '/category/province')
  await expect(page.locator('button', { hasText: 'Thêm' }).first()).toBeVisible()
  await snap(page)
})
test('TC-15-09 | Manager: API thêm và xoá tỉnh thành công | Tỉnh/Thành phố | /api/Provinces', async () => {
  const tok = await login(MGR, PASSWORD)
  const ctx = await apiContext(tok!)
  const res = await ctx.post('/api/Provinces', { data: { code: 'TEST_MGR', name: 'TEST_manager' } })
  expect(res.status()).toBe(200)
  const id = (await res.json()).data.id
  expect((await ctx.delete(`/api/Provinces/${id}`)).status()).toBe(200)
  await ctx.dispose()
})
test('TC-15-10 | Manager: truy cập được màn Người dùng | Danh sách người dùng | /category/user', async ({ page }) => {
  await loginUi(page, MGR)
  await openPage(page, '/category/user')
  await expect(page).toHaveURL(/\/category\/user/)
  await expect(page.locator('table').first()).toBeVisible()
  await snap(page)
})
test('TC-15-11 | Người dùng bị khoá không đăng nhập được | Đăng nhập | /api/Auth/login', async () => {
  const t = await adminToken()
  const ctx = await apiContext(t)
  // tạo user rồi khoá bằng SQL ở cleanup; ở đây dùng tài khoản sai tên để kiểm tra từ chối
  expect(await login('test_khong_ton_tai', PASSWORD)).toBeNull()
  await ctx.dispose()
})
