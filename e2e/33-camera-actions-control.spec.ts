import { test, expect, Page } from '@playwright/test'
import { openPage, snap, dialog, tableRows } from './helpers'
import { adminToken, apiContext } from './helpers/api'

// Camera: các hành động trong cột "Hành động" và điều khiển camera (PTZ, zoom, khởi động lại, hiệu chuẩn).
// Lệnh điều khiển trên giao diện được chặn ở tầng mạng (mock) để KHÔNG làm quay/khởi động lại camera thật;
// chỉ các thao tác đọc (đồng bộ góc quay) và lệnh Stop (dừng) mới gọi tới camera thật.
const PTZ_CAM = { id: 2, name: 'Cam Nhiệt PTZ' }
const FIX_CAM = { id: 5, name: 'Cam Thường Fix' }
let token = ''
test.beforeAll(async () => { token = await adminToken() })

const rowOf = (page: Page, name: string) => page.locator('tr', { hasText: name }).first()
const actionButtons = (page: Page, name: string) => rowOf(page, name).locator('td').last().locator('button')

async function mockControl(page: Page, url: string) {
  const calls: any[] = []
  await page.route(url, async (route) => {
    calls.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ isSuccess: true, code: '200', data: 'ok' }) })
  })
  return calls
}

// ---------------- Hành động trong danh sách camera (nhóm 09) ----------------
test('TC-09-30 | Camera: mỗi dòng có đủ 7 nút hành động (đồng bộ, xem góc quay, chỉnh góc quay, cài đặt góc quay, cài đặt AI, sửa, xoá) | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  expect(await actionButtons(page, PTZ_CAM.name).count()).toBe(7)
  await snap(page)
})
test('TC-09-31 | Camera: nút "Chỉnh góc quay" chỉ hiện với camera giám sát tổng quát (ẩn với camera nhiệt) | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const vis = (n: string) => actionButtons(page, n).nth(2).evaluate((b) => getComputedStyle(b).visibility)
  expect(await vis(PTZ_CAM.name)).toBe('hidden')   // camera nhiệt
  expect(await vis(FIX_CAM.name)).toBe('visible')  // camera thường
  await snap(page)
})
test('TC-09-32 | Camera: rê chuột vào các nút hành động hiện chú thích đúng | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const expected: [number, string][] = [[0, 'Đồng bộ góc quay'], [1, 'Xem danh sách góc quay'], [3, 'Cài đặt góc quay'], [4, 'Cài đặt AI']]
  for (const [i, text] of expected) {
    await actionButtons(page, PTZ_CAM.name).nth(i).hover()
    await expect(page.locator('.el-popper:visible', { hasText: text }).first()).toBeVisible()
  }
  await snap(page)
})
test('TC-09-33 | Camera: "Đồng bộ góc quay" gọi API syncPresets, thành công và báo kết quả | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const resp = page.waitForResponse((r) => r.url().includes(`/api/Cameras/syncPresets/${PTZ_CAM.id}`), { timeout: 60000 })
  await actionButtons(page, PTZ_CAM.name).nth(0).click()
  expect((await resp).status()).toBe(200)
  await page.waitForTimeout(800)
  await snap(page)
})
test('TC-09-34 | Camera: "Xem danh sách góc quay" mở hộp thoại có 2 tab Presets và Tours | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await actionButtons(page, PTZ_CAM.name).nth(1).click()
  await expect(dialog(page)).toContainText('Thông số góc quay')
  await expect(dialog(page)).toContainText('Presets')
  await expect(dialog(page)).toContainText('Tours')
  await snap(page)
})
test('TC-09-35 | Camera: trong hộp thoại góc quay chuyển sang tab Tours và có nút "Đồng bộ từ camera" | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await actionButtons(page, PTZ_CAM.name).nth(1).click()
  await dialog(page).getByText('Tours').first().click()
  await page.waitForTimeout(600)
  await expect(dialog(page)).toContainText('Đồng bộ từ camera')
  await snap(page)
})
test('TC-09-36 | Camera: "Cài đặt góc quay" chuyển tới trang cài đặt của đúng camera | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await actionButtons(page, PTZ_CAM.name).nth(3).click()
  await expect(page).toHaveURL(new RegExp(`camera-setting/${PTZ_CAM.id}`))
  await snap(page)
})
test('TC-09-37 | Camera: "Chỉnh góc quay" (camera thường) mở màn chỉnh vùng quan sát | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await actionButtons(page, FIX_CAM.name).nth(2).click()
  await page.waitForTimeout(1500)
  await expect(page.locator('.el-dialog:visible, .el-drawer:visible').last()).toBeVisible()
  await snap(page)
})
test('TC-09-38 | Camera: "Cài đặt AI" mở màn cài đặt AI của camera | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await actionButtons(page, FIX_CAM.name).nth(4).click()
  await page.waitForTimeout(1500)
  await expect(page.locator('.el-dialog:visible, .el-drawer:visible').last()).toBeVisible()
  await snap(page)
})
test('TC-09-39 | Camera: nút Sửa mở form có dữ liệu hiện tại của camera | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await rowOf(page, FIX_CAM.name).getByRole('button', { name: '✎' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).locator('input').first()).toHaveValue('cam_fix_thuong')
  await snap(page)
})
test('TC-09-40 | Camera: Xoá rồi bấm Hủy ở hộp xác nhận thì camera vẫn còn | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await rowOf(page, FIX_CAM.name).getByRole('button', { name: '🗑' }).click()
  const box = page.locator('.el-message-box:visible')
  await expect(box).toBeVisible()
  await snap(page, 'confirm')
  await box.getByRole('button', { name: /hủy|cancel|không/i }).first().click()
  await expect(box).toBeHidden()
  await expect(rowOf(page, FIX_CAM.name)).toBeVisible()
  await snap(page)
})

// ---------------- Trang cài đặt camera (nhóm 09) ----------------
test('TC-09-41 | Cài đặt camera: hiển thị tên camera, loại (PTZ) và bộ đếm Góc quay/Tour | Cài đặt camera | /category/camera-setting/2', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${PTZ_CAM.id}`)
  const t = await page.locator('body').innerText()
  expect(t).toContain(PTZ_CAM.name); expect(t).toContain('PTZ'); expect(t).toMatch(/Góc quay\s*\d+/); expect(t).toMatch(/Tour\s*\d+/)
  await snap(page)
})
test('TC-09-42 | Cài đặt camera: ô "Cách thực hiện" có các nguồn Tự động / API hãng / ONVIF | Cài đặt camera | /category/camera-setting/2', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${PTZ_CAM.id}`)
  await expect(page.getByText('Cách thực hiện').first()).toBeVisible()
  await page.getByText('Tự động (API hãng → ONVIF)').first().click()
  await page.waitForTimeout(600)
  const opts = (await page.locator('.el-select-dropdown__item:visible').allInnerTexts()).join('|')
  expect(opts).toMatch(/ONVIF/)
  await snap(page)
})
test('TC-09-43 | Cài đặt camera: chuyển giữa tab "Góc quay & Tour" và "Vùng đo nhiệt" | Cài đặt camera | /category/camera-setting/2', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${PTZ_CAM.id}`)
  await page.getByText('Vùng đo nhiệt').first().click()
  await page.waitForTimeout(1000)
  await snap(page, 'thermal')
  await page.getByText('Góc quay & Tour').first().click()
  await page.waitForTimeout(800)
  await expect(page.getByText('Lưu góc quay').first()).toBeVisible()
  await snap(page)
})
test('TC-09-44 | Cài đặt camera: nút "Đồng bộ góc quay" lấy lại danh sách từ camera | Cài đặt camera | /category/camera-setting/2', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${PTZ_CAM.id}`)
  const resp = page.waitForResponse((r) => r.url().includes(`/syncPresets/${PTZ_CAM.id}`), { timeout: 60000 })
  await page.getByRole('button', { name: 'Đồng bộ góc quay' }).first().click()
  expect((await resp).status()).toBe(200)
  await snap(page)
})
test('TC-09-45 | Cài đặt camera: camera cố định (không PTZ) báo không có góc quay/tour | Cài đặt camera | /category/camera-setting/5', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${FIX_CAM.id}`)
  await expect(page.getByText(/không phải PTZ/).first()).toBeVisible()
  await snap(page)
})
test('TC-09-46 | Cài đặt camera: bảng góc quay có cột Số, Tên | Cài đặt camera | /category/camera-setting/2', async ({ page }) => {
  await openPage(page, `/category/camera-setting/${PTZ_CAM.id}`)
  const t = await page.locator('body').innerText()
  expect(t).toContain('Số'); expect(t).toContain('Tên')
  await snap(page)
})

// ---------------- Điều khiển camera trên giao diện (nhóm 03) ----------------
test('TC-03-30 | Điều khiển: camera PTZ có đủ 8 nút hướng, tâm PTZ, thanh tốc độ mặc định 50% | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.waitForTimeout(2000)
  expect(await page.locator('button.live__dir').count()).toBe(8)
  await expect(page.locator('.live__dpad-center')).toHaveText('PTZ')
  await expect(page.locator('.live__panel')).toContainText('Tốc độ quay')
  await expect(page.locator('.live__panel')).toContainText('50%')
  await snap(page)
})
test('TC-03-31 | Điều khiển: camera cố định không có bàn phím hướng nhưng vẫn có Thu phóng và Thiết bị | Điều khiển camera | /stream/detail/5', async ({ page }) => {
  await openPage(page, `/stream/detail/${FIX_CAM.id}`)
  await page.waitForTimeout(2000)
  expect(await page.locator('button.live__dir').count()).toBe(0)
  await expect(page.locator('.live__panel')).toContainText('Thu phóng')
  await expect(page.locator('.live__panel')).toContainText('Khởi động lại')
  await expect(page.locator('.live__panel')).not.toContainText('Hiệu chuẩn')
  await snap(page)
})
for (const dir of ['Up', 'Down', 'Left', 'Right', 'UpLeft', 'UpRight', 'DownLeft', 'DownRight']) {
  test(`TC-03-${32 + ['Up', 'Down', 'Left', 'Right', 'UpLeft', 'UpRight', 'DownLeft', 'DownRight'].indexOf(dir)} | Điều khiển: giữ nút "${dir}" gửi lệnh ${dir} rồi thả ra gửi lệnh Stop | Điều khiển camera | /stream/detail/2`, async ({ page }) => {
    const calls = await mockControl(page, '**/api/Cameras/control')
    await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
    const btn = page.locator(`button.live__dir[aria-label="${dir}"]`)
    await btn.hover()
    await page.mouse.down(); await page.waitForTimeout(500)
    await snap(page)
    await page.mouse.up(); await page.waitForTimeout(500)
    expect(calls.length, 'Không có lệnh nào được gửi').toBeGreaterThanOrEqual(2)
    expect(String(calls[0].command)).toMatch(new RegExp(`^(${dir}|${['Stop', 'Up', 'Down', 'Left', 'Right', 'UpLeft', 'UpRight', 'DownLeft', 'DownRight'].indexOf(dir)})$`))
    expect(calls[0].cameraId).toBe(PTZ_CAM.id)
    expect(String(calls[calls.length - 1].command)).toMatch(/^(Stop|0)$/)
  })
}
test('TC-03-40 | Điều khiển: kéo thanh tốc độ đổi % hiển thị và tốc độ trong lệnh gửi đi | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  const calls = await mockControl(page, '**/api/Cameras/control')
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  const rail = page.locator('.live__panel .el-slider__runway').first()
  const bb = (await rail.boundingBox())!
  await page.mouse.click(bb.x + bb.width * 0.9, bb.y + bb.height / 2)
  await page.waitForTimeout(400)
  await expect(page.locator('.live__panel')).not.toContainText('50%')
  const btn = page.locator('button.live__dir[aria-label="Up"]')
  await btn.hover(); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up(); await page.waitForTimeout(300)
  expect(Number(calls[0].speed)).toBeGreaterThan(0)
  await snap(page)
})
test('TC-03-41 | Điều khiển: nút Phóng to gửi lệnh ZoomIn, Thu nhỏ gửi lệnh ZoomOut | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  const calls = await mockControl(page, '**/api/Cameras/control')
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  for (const label of ['Phóng to', 'Thu nhỏ']) {
    await page.getByRole('button', { name: label }).hover()
    await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up(); await page.waitForTimeout(300)
  }
  const cmds = calls.map((c) => String(c.command))
  expect(cmds.join(',')).toMatch(/ZoomIn|9/); expect(cmds.join(',')).toMatch(/ZoomOut|10/)
  await snap(page)
})
test('TC-03-42 | Điều khiển: Khởi động lại hiện hộp xác nhận; Hủy thì không gửi lệnh | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  const calls = await mockControl(page, '**/api/Cameras/control')
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.getByRole('button', { name: 'Khởi động lại' }).click()
  const box = page.locator('.el-message-box:visible')
  await expect(box).toContainText('Khởi động lại camera?')
  await snap(page, 'confirm')
  await box.getByRole('button', { name: /hủy|cancel|không/i }).first().click()
  await page.waitForTimeout(600)
  expect(calls).toHaveLength(0)
  await snap(page)
})
test('TC-03-43 | Điều khiển: Khởi động lại đồng ý thì gửi lệnh Restart và báo "Đã gửi lệnh tới camera" | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  const calls = await mockControl(page, '**/api/Cameras/control')
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.getByRole('button', { name: 'Khởi động lại' }).click()
  await page.locator('.el-message-box:visible').getByRole('button', { name: /đồng ý|xác nhận|ok|có/i }).first().click()
  await expect(page.locator('.el-message').filter({ hasText: 'Đã gửi lệnh tới camera' }).first()).toBeVisible()
  expect(String(calls[0].command)).toMatch(/Restart|11/)
  await snap(page)
})
test('TC-03-44 | Điều khiển: Hiệu chuẩn hiện hộp xác nhận và gửi lệnh Calibration khi đồng ý | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  const calls = await mockControl(page, '**/api/Cameras/control')
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.getByRole('button', { name: 'Hiệu chuẩn' }).click()
  const box = page.locator('.el-message-box:visible')
  await expect(box).toContainText('calibration')
  await snap(page, 'confirm')
  await box.getByRole('button', { name: /đồng ý|xác nhận|ok|có/i }).first().click()
  await page.waitForTimeout(800)
  expect(String(calls[0].command)).toMatch(/Calibration|12/)
  await snap(page)
})
test('TC-03-45 | Điều khiển: lỗi từ máy chủ khi gửi lệnh được báo cho người dùng (không im lặng) | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  await page.route('**/api/Cameras/control', (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 400, message: 'Không kết nối được tới camera' }) }))
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  const btn = page.locator('button.live__dir[aria-label="Left"]')
  await btn.hover(); await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up(); await page.waitForTimeout(800)
  await expect(page.locator('.el-message--error, .el-message').filter({ hasText: /camera|lỗi/i }).first()).toBeVisible()
  await snap(page)
})
test('TC-03-46 | Điều khiển: nút "Vẽ điểm/vùng" bật chế độ vẽ, hiện gợi ý và nút Đo nhiệt/Thoát | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.getByRole('button', { name: /Vẽ điểm/ }).click()
  await expect(page.getByText('Bấm lên hình để thêm điểm đo').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Đo nhiệt/ }).first()).toBeVisible()
  await snap(page, 'drawing')
  await page.getByRole('button', { name: /Thoát/ }).click()
  await expect(page.getByRole('button', { name: /Vẽ điểm/ })).toBeVisible()
  await snap(page)
})
test('TC-03-47 | Điều khiển: liên kết "Cài đặt camera" mở trang cài đặt đúng camera | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.getByText('Cài đặt camera').first().click()
  await expect(page).toHaveURL(new RegExp(`camera-setting/${PTZ_CAM.id}`))
  await snap(page)
})
test('TC-03-48 | Điều khiển: nút quay lại về màn Giám sát trực tiếp | Điều khiển camera | /stream/detail/2', async ({ page }) => {
  await openPage(page, `/stream/detail/${PTZ_CAM.id}`)
  await page.locator('.live__back').click()
  await expect(page).toHaveURL(/\/live$/)
  await snap(page)
})
test('TC-03-49 | Điều khiển: đường dẫn /live/detail/{id} mở được trang điều khiển (không bị 404) | Điều khiển camera | /live/detail/2', async ({ page }) => {
  await openPage(page, `/live/detail/${PTZ_CAM.id}`)
  await page.waitForTimeout(1500)
  await expect(page).not.toHaveURL(/404/)
  await snap(page)
})

// ---------------- API điều khiển camera (nhóm 14) ----------------
test('TC-14-20 | API điều khiển: lệnh Stop tới camera PTZ thành công (200) | Điều khiển camera | /api/Cameras/control', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Cameras/control', { data: { cameraId: PTZ_CAM.id, command: 0, preCommand: 0, speed: 0 } })
  expect(res.status(), await res.text()).toBe(200)
  await ctx.dispose()
})
test('TC-14-21 | API điều khiển: camera không tồn tại trả lỗi 4xx (không 500) | Điều khiển camera | /api/Cameras/control', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Cameras/control', { data: { cameraId: 999999, command: 0, preCommand: 0, speed: 0 } })
  expect(res.status()).toBeGreaterThanOrEqual(400); expect(res.status()).toBeLessThan(500)
  await ctx.dispose()
})
test('TC-14-22 | API điều khiển: mã lệnh không hợp lệ bị từ chối (4xx) | Điều khiển camera | /api/Cameras/control', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Cameras/control', { data: { cameraId: PTZ_CAM.id, command: 999, preCommand: 0, speed: 0 } })
  expect(res.status(), 'Máy chủ chấp nhận mã lệnh 999').toBeGreaterThanOrEqual(400)
  await ctx.dispose()
})
test('TC-14-23 | API điều khiển: không có token bị từ chối (401) | Điều khiển camera | /api/Cameras/control', async () => {
  const ctx = await apiContext()
  const res = await ctx.post('/api/Cameras/control', { data: { cameraId: PTZ_CAM.id, command: 0, preCommand: 0, speed: 0 } })
  expect(res.status()).toBe(401)
  await ctx.dispose()
})
test('TC-14-24 | API góc quay: đồng bộ góc quay camera PTZ trả danh sách presets | Camera | /api/Cameras/syncPresets/{id}', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post(`/api/Cameras/syncPresets/${PTZ_CAM.id}`, { timeout: 60000 })
  expect(res.status()).toBe(200)
  expect(Array.isArray((await res.json()).data.presets)).toBe(true)
  await ctx.dispose()
})
test('TC-14-25 | API góc quay: danh sách preset và tour của camera đọc được (200) | Camera | /api/Cameras/presetList', async () => {
  const ctx = await apiContext(token)
  for (const url of [`/api/Cameras/presets/all/${PTZ_CAM.id}`, `/api/Cameras/presetList?cameraId=${PTZ_CAM.id}`, `/api/Cameras/tourList?cameraId=${PTZ_CAM.id}`]) {
    const r = await ctx.get(url)
    expect(r.status(), url).toBe(200)
  }
  await ctx.dispose()
})
test('TC-14-26 | API camera: đọc cấu hình hướng và tốc độ tour của camera (200) | Camera | /api/Cameras/{id}/direction', async () => {
  const ctx = await apiContext(token)
  expect((await ctx.get(`/api/Cameras/${PTZ_CAM.id}/tour-speed`)).status()).toBe(200)
  // Camera chưa cấu hình mốc hướng: trả 400 kèm thông báo rõ ràng (không phải 500)
  const d = await ctx.get(`/api/Cameras/${PTZ_CAM.id}/direction`)
  expect([200, 400]).toContain(d.status())
  if (d.status() === 400) expect((await d.json()).message).toContain('mốc hướng')
  await ctx.dispose()
})
test('TC-14-27 | API camera: thông tin chi tiết camera trả đúng id và tên | Camera | /api/Cameras/{id}', async () => {
  const ctx = await apiContext(token)
  const d = (await (await ctx.get(`/api/Cameras/${PTZ_CAM.id}`)).json()).data
  expect(d.id).toBe(PTZ_CAM.id); expect(d.name).toBe(PTZ_CAM.name)
  await ctx.dispose()
})
test('TC-14-28 | API camera: lấy luồng video (stream) của camera trả thông tin kết nối | Camera | /api/Cameras/stream/{id}', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.get(`/api/Cameras/stream/${PTZ_CAM.id}`)
  expect(res.status()).toBe(200)
  await ctx.dispose()
})
test('TC-14-29 | API camera: kiểm tra ONVIF của camera trả trạng thái (200) | Camera | /api/camera-onvif/{id}/check', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post(`/api/camera-onvif/${PTZ_CAM.id}/check`, { timeout: 60000 })
  expect(res.status()).toBe(200)
  expect((await res.json()).data).toHaveProperty('detected')
  await ctx.dispose()
})
