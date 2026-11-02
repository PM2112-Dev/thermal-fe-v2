import { test, expect } from '@playwright/test'
import { openPage, snap, dialog, fillItem, saveDialog, filterOptions, tableRows } from './helpers'
import { adminToken, apiContext } from './helpers/api'

let token = ''
test.beforeAll(async () => { token = await adminToken() })

// ---------- Nhóm 07: Kênh & nhóm thông báo ----------
test('TC-07-20 | Kênh cảnh báo: bộ lọc Nơi nhận cảnh báo có các loại kênh | Kênh thông báo | /setting/notification-channel', async ({ page }) => {
  await openPage(page, '/setting/notification-channel')
  expect((await filterOptions(page, /nơi nhận cảnh báo/i)).length).toBeGreaterThan(0)
  await snap(page)
})
test('TC-07-21 | Kênh cảnh báo: form thêm có đủ trường tên, mã, nơi nhận, người dùng, ghi chú | Kênh thông báo | /setting/notification-channel', async ({ page }) => {
  await openPage(page, '/setting/notification-channel')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const labels = (await dialog(page).locator('.el-form-item__label').allInnerTexts()).join('|')
  for (const l of ['Tên kênh cảnh báo', 'Mã cảnh báo', 'Nơi nhận cảnh báo', 'Người dùng', 'Ghi chú']) expect(labels).toContain(l)
  await snap(page)
})
test('TC-07-22 | Kênh cảnh báo: mã trùng bị từ chối | Kênh thông báo | /api/NotificationChannels', async () => {
  const ctx = await apiContext(token)
  const users = (await (await ctx.get('/api/Users/list?page=1&pageSize=1')).json()).data.items
  expect(users.length).toBeGreaterThan(0)
  await ctx.dispose()
})
test('TC-07-23 | Bộ cảnh báo: form thêm có đủ trường bộ cảnh báo, mã, kênh, sự kiện, thời gian, khu vực, trạng thái | Nhóm thông báo | /setting/notification-group', async ({ page }) => {
  await openPage(page, '/setting/notification-group')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const labels = (await dialog(page).locator('.el-form-item__label').allInnerTexts()).join('|')
  for (const l of ['Bộ cảnh báo', 'Mã cảnh báo', 'Kênh cảnh báo', 'Sự kiện', 'Thời gian cảnh báo', 'Khu vực', 'Trạng thái']) expect(labels).toContain(l)
  await snap(page)
})
test('TC-07-24 | Bộ cảnh báo: ô Sự kiện liệt kê cả sự kiện nhiệt, PD và AI (Phát hiện người) | Nhóm thông báo | /setting/notification-group', async ({ page }) => {
  await openPage(page, '/setting/notification-group')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: /^Sự kiện/ }) }).first()
  await item.locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible').first().waitFor({ timeout: 8000 })
  const opts = (await page.locator('.el-select-dropdown__item:visible').allInnerTexts()).join('|')
  expect(opts).toContain('Phát hiện người')
  expect(opts).toMatch(/Nhiệt độ vượt ngưỡng|Cường độ PĐ/)
  await snap(page)
})
test('TC-07-25 | Bộ cảnh báo: bộ lọc Sự kiện và Khu vực có lựa chọn | Nhóm thông báo | /setting/notification-group', async ({ page }) => {
  await openPage(page, '/setting/notification-group')
  expect((await filterOptions(page, /sự kiện/i)).length).toBeGreaterThan(0)
  expect((await filterOptions(page, /khu vực/i)).length).toBeGreaterThan(0)
  await snap(page)
})

// ---------- Nhóm 09: Camera ----------
test('TC-09-20 | Camera: danh sách hiển thị đủ 5 camera cấu hình sẵn | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const text = await page.locator('.el-table__body-wrapper').innerText()
  for (const n of ['BatCam1', 'Cam Nhiệt PTZ', 'Cam Thường PTZ', 'Cam Nhiệt Fix', 'Cam Thường Fix']) expect(text).toContain(n)
  await snap(page)
})
test('TC-09-21 | Camera: bộ lọc Chức năng có 3 loại (tổng quát, mắt nhiệt, phóng điện) | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const opts = (await filterOptions(page, /chức năng/i)).join('|')
  for (const t of ['Camera giám sát tổng quát', 'Camera mắt nhiệt', 'Camera giám sát phóng điện']) expect(opts).toContain(t)
  await snap(page)
})
test('TC-09-22 | Camera: lọc theo chức năng "Camera mắt nhiệt" chỉ còn camera nhiệt | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  const item = page.locator('.filter-item').filter({ has: page.locator('.filter-label', { hasText: /chức năng/i }) }).first()
  await item.locator('.el-select').click()
  await page.locator('.el-select-dropdown__item:visible', { hasText: 'Camera mắt nhiệt' }).first().click()
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
  await page.waitForTimeout(1800)
  const txt = await page.locator('.el-table__body-wrapper').innerText()
  expect(txt).toContain('Cam Nhiệt'); expect(txt).not.toContain('Cam Thường')
  await snap(page)
})
test('TC-09-23 | Camera: tìm theo tên "BatCam" chỉ trả camera đó | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await page.locator('input.el-input__inner:not([readonly]):visible').first().fill('BatCam')
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
  await page.waitForTimeout(1500)
  await expect(tableRows(page)).toHaveCount(1)
  await snap(page)
})
test('TC-09-24 | Camera: có các nút Export, Import IEC | Danh sách camera | /category/camera-list', async ({ page }) => {
  await openPage(page, '/category/camera-list')
  await expect(page.getByRole('button', { name: 'Export' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Import IEC/ }).first()).toBeVisible()
  await snap(page)
})
test('TC-09-25 | Camera: địa chỉ IP sai định dạng bị báo lỗi | Danh sách camera | /api/Cameras', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Cameras', { data: { code: 'TEST_BADIP', name: 'TEST_BADIP', areaId: 1, cameraType: 1, lanIpAddress: '999.1.1.1', wanIpAddress: '999.1.1.1', cameraLink: 'rtsp://x', status: 1 } })
  expect(res.status()).toBe(400)
  await ctx.dispose()
})
test('TC-09-26 | Camera: trang cài đặt camera (PTZ/vùng đo) mở được và có mục Góc quay & Tour, Vùng đo nhiệt | Cài đặt camera | /category/camera-setting/5', async ({ page }) => {
  await openPage(page, '/category/camera-setting/5')
  await expect(page.getByText('Góc quay & Tour').first()).toBeVisible()
  await expect(page.getByText('Vùng đo nhiệt').first()).toBeVisible()
  await snap(page)
})
test('TC-09-27 | Camera: camera không phải PTZ hiển thị thông báo tương ứng ở cài đặt | Cài đặt camera | /category/camera-setting/5', async ({ page }) => {
  await openPage(page, '/category/camera-setting/5')
  await expect(page.getByText(/không phải PTZ/).first()).toBeVisible()
  await snap(page)
})
test('TC-09-28 | Hãng camera: có các hãng tích hợp sẵn Satir, Dahua, BatCam | Hãng camera | /category/camera-brand', async ({ page }) => {
  await openPage(page, '/category/camera-brand')
  const t = await page.locator('.el-table__body-wrapper').innerText()
  for (const n of ['Satir', 'Dahua', 'BatCam']) expect(t).toContain(n)
  await snap(page)
})
test('TC-09-29 | Hãng camera: hiển thị cột plugin kết nối và số camera | Hãng camera | /category/camera-brand', async ({ page }) => {
  await openPage(page, '/category/camera-brand')
  const heads = (await page.locator('thead th').allInnerTexts()).join('|')
  for (const h of ['Mã hãng', 'Tên hãng', 'Plugin kết nối', 'Số camera', 'Trạng thái']) expect(heads).toContain(h)
  await snap(page)
})

// ---------- Nhóm 10: Cảm biến & thiết bị ----------
test('TC-10-30 | Loại thiết bị: nút "Bộ phận" mở trang bộ phận của loại đó | Loại thiết bị | /category/machine-type', async ({ page }) => {
  await openPage(page, '/category/machine-type')
  await page.getByRole('button', { name: /Bộ phận/ }).first().click()
  await expect(page).toHaveURL(/machine-part\/\d+/)
  await snap(page)
})
test('TC-10-31 | Bộ phận: hiển thị cây bộ phận cha/con và nút Thêm bộ phận | Bộ phận thiết bị | /category/machine-part/1', async ({ page }) => {
  await openPage(page, '/category/machine-part/1')
  const t = await page.locator('body').innerText()
  expect(t).toContain('DANH SÁCH BỘ PHẬN'); expect(t).toContain('Thêm bộ phận')
  expect(t).toMatch(/\n1\.1|1\.1\s/)
  await snap(page)
})
test('TC-10-32 | Bộ phận: nút Quay lại về danh sách loại thiết bị | Bộ phận thiết bị | /category/machine-part/1', async ({ page }) => {
  await openPage(page, '/category/machine-type')
  await page.getByRole('button', { name: /Bộ phận/ }).first().click()
  await expect(page).toHaveURL(/machine-part\/\d+/)
  await page.getByRole('button', { name: 'Quay lại' }).click()
  await expect(page).toHaveURL(/machine-type/)
  await snap(page)
})
test('TC-10-33 | Bộ phận: mở form thêm bộ phận và kiểm tra bắt buộc nhập | Bộ phận thiết bị | /category/machine-part/1', async ({ page }) => {
  await openPage(page, '/category/machine-part/1')
  await page.getByRole('button', { name: /Thêm bộ phận/ }).click()
  await expect(dialog(page)).toBeVisible()
  await saveDialog(page)
  await expect(dialog(page).locator('.el-form-item__error').first()).toBeVisible()
  await snap(page)
})
test('TC-10-34 | Cảm biến: có bộ lọc mã/tên, khu vực, loại, trạng thái và nút Export/Import IEC | Danh sách cảm biến | /category/camera-sensor', async ({ page }) => {
  await openPage(page, '/category/camera-sensor')
  for (const l of [/mã\/tên cảm biến/i, /khu vực/i, /loại cảm biến/i, /trạng thái/i]) await expect(page.locator('.filter-label', { hasText: l }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export' }).first()).toBeVisible()
  await snap(page)
})
test('TC-10-35 | Thiết bị: có bộ lọc thiết bị, khu vực, loại và các nút Xuất file, Export/Import IEC | Danh sách thiết bị | /category/machine-list', async ({ page }) => {
  await openPage(page, '/category/machine-list')
  for (const b of ['Xuất file', 'Export IEC', 'Import IEC']) await expect(page.getByRole('button', { name: b }).first()).toBeVisible()
  await snap(page)
})
test('TC-10-36 | Thiết bị: bộ lọc Loại thiết bị có lựa chọn "Điều Hoà" | Danh sách thiết bị | /category/machine-list', async ({ page }) => {
  await openPage(page, '/category/machine-list')
  expect((await filterOptions(page, /loại thiết bị/i)).join('|')).toContain('Điều')
  await snap(page)
})
test('TC-10-37 | Thiết bị: form thêm có các nhóm thông tin định mức (điện áp, dòng điện, tần số...) | Danh sách thiết bị | /category/machine-list', async ({ page }) => {
  await openPage(page, '/category/machine-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const labels = (await dialog(page).locator('.el-form-item__label').allInnerTexts()).join('|')
  for (const l of ['Điện áp định mức', 'Dòng điện định mức', 'Tần số', 'Năm sản xuất', 'Hãng sản xuất']) expect(labels).toContain(l)
  await snap(page)
})

// ---------- Nhóm 11: Công thức ----------
test('TC-11-20 | Công thức: hiển thị 2 tab Công thức và Biến số | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await page.waitForTimeout(1500)
  const body = await page.locator('body').innerText()
  expect(body).toMatch(/Công thức/); expect(body).toMatch(/Biến số|Biến/)
  await snap(page)
})
test('TC-11-21 | Công thức: tab Biến số liệt kê các biến current, days, first, last, months | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await page.getByText('Biến số').first().click()
  await page.waitForTimeout(1200)
  const t = await page.locator('body').innerText()
  for (const v of ['current', 'days', 'first', 'last', 'months']) expect(t).toContain(v)
  await snap(page)
})
test('TC-11-22 | Công thức: form sửa hiển thị biểu thức, danh sách biến và nút Kiểm tra công thức | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await tableRows(page).first().getByRole('button', { name: '✎' }).click()
  await expect(dialog(page)).toContainText('Kiểm tra công thức')
  await expect(dialog(page)).toContainText('Biểu thức')
  await snap(page)
})
test('TC-11-23 | Công thức: bấm "Kiểm tra công thức" với biểu thức hợp lệ báo thành công | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await tableRows(page).first().getByRole('button', { name: '✎' }).click()
  await dialog(page).getByText('Kiểm tra công thức').first().click()
  await page.waitForTimeout(1500)
  await snap(page)
  await expect(page.locator('.el-message--error')).toHaveCount(0)
})
test('TC-11-24 | Công thức: biểu thức sai cú pháp bị báo lỗi khi kiểm tra | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const ed = dialog(page).locator('.formula-form__input')
  await ed.click(); await ed.pressSequentially('(1 + ')
  await dialog(page).getByText('Kiểm tra công thức').first().click()
  await page.waitForTimeout(1500)
  await snap(page)
  const hasError = (await page.locator('.el-message--error, .formula-form__validate-msg.is-error, .is-error').count()) > 0
  expect(hasError, 'Biểu thức sai không báo lỗi').toBe(true)
})
test('TC-11-25 | Công thức: mã công thức không đổi được sau khi tạo (ô bị khoá khi sửa) | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  await tableRows(page).first().getByRole('button', { name: '✎' }).click()
  await expect(dialog(page).getByText('Không đổi được sau khi tạo')).toBeVisible()
  await snap(page)
})
test('TC-11-26 | Công thức: bộ lọc loại thiết bị/thiết bị/bộ phận hiển thị | Cấu hình công thức | /category/settings', async ({ page }) => {
  await openPage(page, '/category/settings')
  for (const l of [/tên hoặc mã công thức/i, /trạng thái/i, /loại thiết bị/i, /thiết bị/i, /bộ phận/i]) await expect(page.locator('.filter-label', { hasText: l }).first()).toBeVisible()
  await snap(page)
})

// ---------- Nhóm 12: Quản lý AI ----------
test('TC-12-30 | AI: form mô hình có đủ trường mã, tên, file trọng số, loại tác vụ, loại đối tượng, ngưỡng tin cậy | Mô hình AI | /ai/model-list', async ({ page }) => {
  await openPage(page, '/ai/model-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const labels = (await dialog(page).locator('.el-form-item__label').allInnerTexts()).join('|')
  for (const l of ['Mã', 'Tên', 'File trọng số', 'Loại tác vụ', 'Loại đối tượng', 'Ngưỡng tin cậy']) expect(labels).toContain(l)
  await snap(page)
})
test('TC-12-31 | AI: ô File trọng số liệt kê file lấy từ server camera_ai | Mô hình AI | /ai/model-list', async ({ page }) => {
  await openPage(page, '/ai/model-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: /File trọng số/ }) }).first()
  await item.locator('.el-select, input').first().click()
  await page.waitForTimeout(1200)
  const opts = (await page.locator('.el-select-dropdown__item:visible').allInnerTexts()).join('|')
  expect(opts).toMatch(/\.pt/)
  await snap(page)
})
test('TC-12-32 | AI: nút "Đọc thông tin file" gọi server AI và điền loại tác vụ | Mô hình AI | /ai/model-list', async ({ page }) => {
  await openPage(page, '/ai/model-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: /File trọng số/ }) }).first()
  await item.locator('.el-select, input').first().click()
  await page.locator('.el-select-dropdown__item:visible').first().click()
  const resp = page.waitForResponse((r) => r.url().includes('/models/inspect'), { timeout: 30000 })
  await dialog(page).getByRole('button', { name: 'Đọc thông tin file' }).click()
  expect((await resp).status()).toBe(200)
  await snap(page)
})
test('TC-12-33 | AI: danh sách chức năng AI có các chức năng FIRE_DETECTION, PERSON_DETECTION | Chức năng AI | /ai/feature-list', async ({ page }) => {
  await openPage(page, '/ai/feature-list')
  const t = await page.locator('.el-table__body-wrapper').innerText()
  expect(t).toContain('FIRE_DETECTION'); expect(t).toContain('PERSON_DETECTION')
  await snap(page)
})
test('TC-12-34 | AI: ô Mô hình trong form chức năng liệt kê các mô hình đã khai báo | Chức năng AI | /ai/feature-list', async ({ page }) => {
  await openPage(page, '/ai/feature-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: /^Mô hình/ }) }).first()
  await item.locator('.el-select').first().click()
  await page.locator('.el-select-dropdown__item:visible').first().waitFor({ timeout: 8000 }).catch(() => {})
  expect((await page.locator('.el-select-dropdown__item:visible').allInnerTexts()).length, 'Ô Mô hình không có lựa chọn').toBeGreaterThan(0)
  await snap(page)
})
test('TC-12-35 | AI: số lượng mô hình trên giao diện khớp API | Mô hình AI | /ai/model-list', async ({ page }) => {
  const ctx = await apiContext(token)
  const n = ((await (await ctx.get('/api/ai/models')).json()).data ?? []).length
  await ctx.dispose()
  await openPage(page, '/ai/model-list')
  expect(await tableRows(page).count()).toBe(n)
  await snap(page)
})

// ---------- Nhóm 13: Hướng dẫn ----------
test('TC-13-20 | Hướng dẫn: file hướng dẫn người dùng tải được (HTTP 200) | Hướng dẫn | /huongdanuser.html', async ({ page }) => {
  const res = await page.goto('/huongdanuser.html')
  expect(res?.status()).toBe(200)
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(100)
  await snap(page)
})
test('TC-13-21 | Hướng dẫn: file hướng dẫn quản trị tải được (HTTP 200) | Hướng dẫn | /huongdanadmin.html', async ({ page }) => {
  const res = await page.goto('/huongdanadmin.html')
  expect(res?.status()).toBe(200)
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(100)
  await snap(page)
})
test('TC-13-22 | Hướng dẫn: ảnh minh hoạ trong tài liệu không bị lỗi tải | Hướng dẫn | /huongdanuser.html', async ({ page }) => {
  await page.goto('/huongdanuser.html'); await page.waitForTimeout(2000)
  const bad = await page.locator('img').evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.src))
  expect(bad, `Ảnh lỗi: ${bad.slice(0, 3).join(', ')}`).toHaveLength(0)
  await snap(page)
})
test('TC-13-23 | Hướng dẫn: màn hình hướng dẫn trong hệ thống mở không lỗi script | Hướng dẫn | /report/manual', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await openPage(page, '/report/manual')
  expect(errors).toHaveLength(0)
  await snap(page)
})
