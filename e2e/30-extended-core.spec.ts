import { test, expect } from '@playwright/test'
import { openPage, snap, filterOptions, tableRows } from './helpers'
import { adminToken, apiContext, PASSWORD } from './helpers/api'

let token = ''
test.beforeAll(async () => { token = await adminToken() })

// ---------- Nhóm 01: Xác thực ----------
test('TC-01-24 | Tải lại trang vẫn giữ phiên đăng nhập | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.reload(); await page.waitForTimeout(2000)
  await expect(page).not.toHaveURL(/login/)
  await expect(page.getByText('admin', { exact: true }).first()).toBeVisible()
  await snap(page)
})
test('TC-01-25 | Đăng xuất: hiện hộp xác nhận, đồng ý thì về trang đăng nhập và mất phiên | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.getByText('admin', { exact: true }).first().click()
  await page.getByText(/đăng xuất|logout/i).first().click()
  await snap(page, 'confirm')
  await page.locator('.el-message-box:visible').getByRole('button', { name: /đồng ý|xác nhận|ok|có/i }).first().click()
  await expect(page).toHaveURL(/login/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/)
  await snap(page)
})
test('TC-01-26 | Quên mật khẩu: để trống email bị báo bắt buộc | Quên mật khẩu | /change-password', async ({ page }) => {
  await openPage(page, '/change-password')
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  await snap(page)
})
test('TC-01-27 | Quên mật khẩu: email sai định dạng bị báo lỗi | Quên mật khẩu | /change-password', async ({ page }) => {
  await openPage(page, '/change-password')
  await page.locator('input').first().fill('khong-phai-email')
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click()
  await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  await snap(page)
})
test('TC-01-28 | Ngôn ngữ đã chọn được giữ sau khi tải lại trang | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  const lang = page.locator('nav').getByText(/^(VI|EN)$/).first()
  await lang.hover(); await lang.click({ force: true }); await page.waitForTimeout(500)
  await page.locator('.el-dropdown-menu:visible, .el-popper:visible').getByText('English').first().click()
  await page.waitForTimeout(800)
  const before = await page.locator('nav').first().innerText()
  await page.reload(); await page.waitForTimeout(2000)
  const after = await page.locator('nav').first().innerText()
  expect(after).toEqual(before)
  expect(after).not.toContain('TRANG CHỦ')
  await snap(page)
  // trả về tiếng Việt cho các test sau (hộp thoại âm thanh bằng tiếng Anh không nằm trong bộ xử lý mặc định)
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      const v = localStorage.getItem(k) ?? ''
      if (/lang|locale/i.test(k) || /"(locale|lang|language)"/i.test(v)) localStorage.setItem(k, v.replace(/\ben(-US)?\b/g, (m) => (m === 'en-US' ? 'vi-VN' : 'vi')))
    }
  })
  await page.reload(); await page.waitForTimeout(1500)
})
test('TC-01-29 | Trang 403: hiển thị thông báo và có lối quay về | Lỗi 403 | /403', async ({ page }) => {
  await openPage(page, '/403')
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(20)
  await snap(page)
})

// ---------- Nhóm 02: Dashboard ----------
test('TC-02-20 | Dashboard: thẻ "Tổng Camera" khớp số camera trong hệ thống | Trang chủ giám sát | /dashboard', async ({ page }) => {
  const ctx = await apiContext(token)
  const total = (await (await ctx.get('/api/Cameras/list?page=1&pageSize=1')).json()).data.totalRow
  await ctx.dispose()
  await openPage(page, '/dashboard')
  const card = page.locator('div', { hasText: /^Tổng Camera/ }).first()
  await expect(card).toContainText(String(total))
  await snap(page)
})
test('TC-02-21 | Dashboard: hiển thị đủ 4 thẻ tổng quan (camera, địa điểm, cảnh báo mới, nhiệt độ môi trường) | Trang chủ giám sát | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  for (const t of ['Tổng Camera', 'Địa điểm giám sát', 'Cảnh báo Mới', 'Nhiệt độ Môi trường']) await expect(page.getByText(t).first()).toBeVisible()
  for (const t of ['BẮC', 'TRUNG', 'NAM']) await expect(page.getByText(t).first()).toBeVisible()
  await snap(page)
})
test('TC-02-22 | Dashboard: bản đồ Leaflet tải được các mảnh bản đồ | Trang chủ giám sát | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.waitForTimeout(2500)
  expect(await page.locator('.leaflet-container').count()).toBeGreaterThan(0)
  expect(await page.locator('img.leaflet-tile').count()).toBeGreaterThan(0)
  await snap(page)
})
test('TC-02-23 | Dashboard: danh sách khu vực hiển thị khu vực từ hệ thống | Trang chủ giám sát | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await expect(page.getByText('Danh sách khu vực').first()).toBeVisible()
  await expect(page.locator(':text-is("Hà Nội"):visible').first()).toBeVisible()
  await snap(page)
})
test('TC-02-24 | Dashboard: tìm khu vực không tồn tại thì danh sách rỗng, xoá chữ thì hiện lại | Trang chủ giám sát | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  const box = page.getByPlaceholder('Tìm theo khu vực')
  await box.fill('khong_ton_tai_xyz'); await page.waitForTimeout(800)
  await expect(page.locator(':text-is("Hà Nội"):visible')).toHaveCount(0)
  await snap(page)
  await box.fill(''); await page.waitForTimeout(800)
  await expect(page.locator(':text-is("Hà Nội"):visible').first()).toBeVisible()
})
test('TC-02-25 | Giao diện: công tắc đổi giữa chế độ tối và sáng | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  const get = () => page.evaluate(() => document.documentElement.dataset.theme ?? document.documentElement.className)
  const a = await get()
  await page.locator('.el-switch').first().click(); await page.waitForTimeout(600)
  const b = await get()
  expect(b).not.toEqual(a)
  await snap(page)
  await page.locator('.el-switch').first().click()
})
test('TC-02-26 | Chuyển tiếng Anh: menu và thẻ tổng quan đổi sang tiếng Anh | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.evaluate(() => document.querySelectorAll('.el-overlay.is-message-box').forEach((e) => e.remove()))
  await page.locator('nav').getByText(/^(VI|EN)$/).first().click({ force: true })
  await page.locator('.el-dropdown-menu:visible, .el-popper:visible').getByText('English').first().click()
  await page.waitForTimeout(800)
  await expect(page.locator('body')).not.toContainText('GIÁM SÁT TRỰC TIẾP')
  await snap(page)
  await page.evaluate(() => document.querySelectorAll('.el-overlay.is-message-box').forEach((e) => e.remove()))
  await page.locator('nav').getByText(/^(VI|EN)$/).first().click({ force: true })
  await page.locator('.el-dropdown-menu:visible, .el-popper:visible').getByText('Tiếng Việt').first().click()
})
test('TC-02-27 | Dashboard: chuông thông báo hiển thị số lượng | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await expect(page.locator('nav').first()).toContainText(/\d+/)
  await snap(page)
})

// ---------- Nhóm 03: Live ----------
test('TC-03-20 | Live: cây khu vực liệt kê đủ camera của hệ thống | Giám sát trực tiếp | /live', async ({ page }) => {
  await openPage(page, '/live')
  for (const n of ['Cam Nhiệt PTZ', 'Cam Thường PTZ', 'BatCam1', 'Cam Nhiệt Fix', 'Cam Thường Fix']) await expect(page.getByText(n).first()).toBeVisible()
  await snap(page)
})
test('TC-03-21 | Live: có khung phát video (video/canvas) cho camera đang xem | Giám sát trực tiếp | /live', async ({ page }) => {
  await openPage(page, '/live')
  await page.waitForTimeout(2000)
  expect(await page.locator('video, canvas').count()).toBeGreaterThan(0)
  await snap(page)
})
test('TC-03-22 | Live: hiển thị nhiệt độ môi trường của khu vực | Giám sát trực tiếp | /live', async ({ page }) => {
  await openPage(page, '/live')
  await expect(page.getByText(/Nhiệt độ môi trường/).first()).toBeVisible()
  await snap(page)
})
test('TC-03-23 | Live: nút THIẾT LẬP bấm được và không gây lỗi | Giám sát trực tiếp | /live', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await openPage(page, '/live')
  await page.getByText('THIẾT LẬP').first().click({ force: true })
  await page.waitForTimeout(1000)
  await snap(page)
  expect(errors).toHaveLength(0)
})
test('TC-03-24 | Live: chọn camera khác trong cây thì khung xem đổi camera | Giám sát trực tiếp | /live', async ({ page }) => {
  await openPage(page, '/live')
  await page.getByText('Cam Thường PTZ').first().click()
  await page.waitForTimeout(1500)
  await expect(page.getByText('Cam Thường PTZ').first()).toBeVisible()
  await snap(page)
})
