import { test, expect, Page } from '@playwright/test'
import { openPage, snap } from './helpers'

interface V { id: string; fn: string; screen: string; route: string; check?: (p: Page) => Promise<void> }
const search = async (p: Page) => {
  const b = p.getByRole('button', { name: 'Tìm kiếm' }).first()
  if (await b.count()) { await b.click(); await p.waitForTimeout(1500) }
}
const views: V[] = [
  { id: '02-01', fn: 'Xem tổng quan (số camera, địa điểm, cảnh báo, nhiệt độ môi trường)', screen: 'Trang chủ giám sát', route: '/dashboard' },
  { id: '03-01', fn: 'Xem danh sách khu vực & camera trực tiếp', screen: 'Giám sát trực tiếp', route: '/live' },
  { id: '04-01', fn: 'Xem nhật ký nhiệt độ theo điểm đo & thống kê cảnh báo', screen: 'Trang chủ sự kiện', route: '/event/home' },
  { id: '04-02', fn: 'Xem & tìm kiếm danh sách nhiệt độ vượt ngưỡng', screen: 'Cảnh báo nhiệt độ', route: '/event/notification-system', check: search },
  { id: '04-03', fn: 'Xem & tìm kiếm nhật ký nhiệt độ', screen: 'Lịch sử sự kiện nhiệt', route: '/event/event-history', check: search },
  { id: '05-01', fn: 'Xem & tìm kiếm danh sách cảnh báo phóng điện', screen: 'Cảnh báo phóng điện (PD)', route: '/event/pd-notification-system', check: search },
  { id: '05-02', fn: 'Xem & tìm kiếm nhật ký phóng điện', screen: 'Lịch sử phóng điện', route: '/event/pd-history', check: search },
  { id: '05-03', fn: 'Xem thống kê phóng điện vượt ngưỡng', screen: 'Tổng hợp phóng điện', route: '/event/pd-summary', check: search },
  { id: '06-01', fn: 'Xem & tìm kiếm cảnh báo AI', screen: 'Cảnh báo AI', route: '/event/ai-notification', check: search },
  { id: '12-01', fn: 'Xem danh sách chức năng AI', screen: 'Chức năng AI', route: '/ai/feature-list' },
  { id: '12-02', fn: 'Xem danh sách mô hình AI', screen: 'Mô hình AI', route: '/ai/model-list' },
  { id: '13-01', fn: 'Xem hướng dẫn sử dụng', screen: 'Hướng dẫn', route: '/report/manual' },
]
for (const v of views) {
  test(`TC-${v.id} | ${v.fn} | ${v.screen} | ${v.route}`, async ({ page }) => {
    await openPage(page, v.route)
    await expect(page).toHaveURL(new RegExp(v.route.replace(/\//g, '\\/')))
    await expect(page.locator('body')).not.toContainText('404')
    if (v.check) await v.check(page)
    await snap(page)
  })
}

test('TC-03-02 | Mở chi tiết camera trực tiếp | Chi tiết camera | /live/detail/:id', async ({ page }) => {
  await openPage(page, '/live')
  const cam = page.getByText('Cam Nhiệt PTZ').first()
  await cam.click({ timeout: 8000 })
  await page.waitForTimeout(3000)
  await snap(page)
})
test('TC-02-02 | Chuyển ngôn ngữ giao diện sang tiếng Anh | Trang chủ giám sát | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.getByRole('button', { name: 'VI' }).first().click()
  await page.waitForTimeout(600)
  await snap(page, 'menu')
  const en = page.getByText(/English|EN/).first()
  if (await en.count()) await en.click().catch(() => {})
  await page.waitForTimeout(800)
  await snap(page)
})
test('TC-01-09 | Mở menu người dùng (đăng xuất, đổi mật khẩu) | Thanh điều hướng | /dashboard', async ({ page }) => {
  await openPage(page, '/dashboard')
  await page.getByText('admin', { exact: true }).first().click()
  await page.waitForTimeout(600)
  await snap(page)
})
test('TC-01-10 | Hiển thị trang đổi mật khẩu | Đổi mật khẩu | /change-password', async ({ page }) => {
  await openPage(page, '/change-password')
  await snap(page)
})
