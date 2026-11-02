import { test, expect } from '@playwright/test'
import { openPage, snap } from './helpers'

// Nhóm 16: giao diện di động (viewport 390x844) - danh sách chuyển sang dạng thẻ
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

const screens: [string, string, string][] = [
  ['01', 'Tỉnh/Thành phố', '/category/province'],
  ['02', 'Khu vực', '/category/area'],
  ['03', 'Camera', '/category/camera-list'],
  ['04', 'Cảnh báo AI', '/event/ai-notification'],
  ['05', 'Cảnh báo phóng điện (PD)', '/event/pd-notification-system'],
  ['06', 'Dashboard', '/dashboard'],
]
for (const [n, name, route] of screens) {
  test(`TC-16-${n} | Di động: màn ${name} hiển thị đúng, không tràn ngang | ${name} | ${route}`, async ({ page }) => {
    await openPage(page, route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'Trang bị tràn ngang').toBeLessThanOrEqual(2)
    await snap(page)
  })
}
test('TC-16-07 | Di động: màn Tỉnh/Thành phố mở form thêm toàn màn hình | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, '/category/province')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  await page.waitForTimeout(800)
  await expect(page.locator('.el-drawer:visible')).toBeVisible()
  await snap(page)
})
