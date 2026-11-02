import { test, expect } from '@playwright/test'
import { openPage, dialog, fillItem, saveDialog, snap, findRow, confirmDelete } from './helpers'
import { adminToken, apiContext } from './helpers/api'

// Nhóm 08: kiểm thử chi tiết màn Tỉnh/Thành phố
const ROUTE = '/category/province'
let token = ''
test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  token = await adminToken()
  const ctx = await apiContext(token)
  for (let i = 1; i <= 12; i++) await ctx.post('/api/Provinces', { data: { code: `TEST_PG${String(i).padStart(2, '0')}`, name: `TEST_Tỉnh phân trang ${i}` } })
  await ctx.dispose()
})

test('TC-08-30 | Tỉnh: trùng mã khi thêm hiển thị thông báo "Mã đã tồn tại" và không lưu | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  await fillItem(page, 'Mã tỉnh', 'TEST_PG01'); await fillItem(page, 'Tên tỉnh/thành phố', 'TEST_Trùng mã')
  await saveDialog(page)
  await expect(page.locator('.el-message--error, .el-message').filter({ hasText: /đã tồn tại/ }).first()).toBeVisible()
  await expect(dialog(page)).toBeVisible()
  await snap(page)
})
test('TC-08-31 | Tỉnh: ô mã giới hạn 50 ký tự, ô tên giới hạn 200 ký tự | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const code = dialog(page).locator('.el-form-item').nth(0).locator('input')
  const name = dialog(page).locator('.el-form-item').nth(1).locator('input')
  await code.fill('x'.repeat(80)); await name.fill('y'.repeat(260))
  expect((await code.inputValue()).length).toBe(50)
  expect((await name.inputValue()).length).toBe(200)
  await snap(page)
})
test('TC-08-32 | Tỉnh: bấm Hủy đóng biểu mẫu và không thêm bản ghi | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  await fillItem(page, 'Mã tỉnh', 'TEST_HUY'); await fillItem(page, 'Tên tỉnh/thành phố', 'TEST_Hủy')
  await dialog(page).getByRole('button', { name: 'Hủy' }).click()
  await expect(page.locator('.el-drawer:visible')).toHaveCount(0)
  const ctx = await apiContext(token)
  const r = (await (await ctx.get('/api/Provinces/list?page=1&pageSize=5&name=TEST_HUY')).json()).data
  expect(r.totalRow).toBe(0)
  await ctx.dispose()
  await snap(page)
})
test('TC-08-33 | Tỉnh: mở form sửa hiển thị đúng mã và tên hiện có | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  const row = await findRow(page, 'TEST_PG01')
  await row.getByRole('button', { name: '✎' }).click()
  await expect(dialog(page).locator('input').nth(0)).toHaveValue('TEST_PG01')
  await expect(dialog(page).locator('input').nth(1)).toHaveValue('TEST_Tỉnh phân trang 1')
  await snap(page)
})
test('TC-08-34 | Tỉnh: tìm theo mã trả đúng một bản ghi | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('input.el-input__inner:not([readonly]):visible').first().fill('TEST_PG07')
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
  await page.waitForTimeout(1500)
  await expect(page.locator('.el-table__body-wrapper tbody tr')).toHaveCount(1)
  await snap(page)
})
test('TC-08-35 | Tỉnh: tìm không có kết quả hiển thị "Không có dữ liệu" | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('input.el-input__inner:not([readonly]):visible').first().fill('KHONG_TON_TAI_XYZ')
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
  await page.waitForTimeout(1500)
  await expect(page.getByText('Không có dữ liệu').first()).toBeVisible()
  await snap(page)
})
test('TC-08-36 | Tỉnh: 12 bản ghi chia 2 trang, trang 2 có dữ liệu khác trang 1 | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  await openPage(page, ROUTE)
  await page.locator('input.el-input__inner:not([readonly]):visible').first().fill('TEST_PG')
  await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
  await page.waitForTimeout(1500)
  const first = await page.locator('.el-table__body-wrapper tbody tr').first().innerText()
  await page.locator('.el-pagination .el-pager li', { hasText: /^2$/ }).click()
  await page.waitForTimeout(1500)
  expect(await page.locator('.el-table__body-wrapper tbody tr').count()).toBe(2)
  expect(await page.locator('.el-table__body-wrapper tbody tr').first().innerText()).not.toEqual(first)
  await snap(page)
})
test('TC-08-37 | Tỉnh: danh sách sắp xếp theo tên | Tỉnh/Thành phố | /category/province', async () => {
  const ctx = await apiContext(token)
  const items = (await (await ctx.get('/api/Provinces/list?page=1&pageSize=50&name=TEST_PG')).json()).data.items
  const names = items.map((i: any) => i.name)
  expect(names).toEqual([...names].sort((a: string, b: string) => a.localeCompare(b, 'en')))
  await ctx.dispose()
})
test('TC-08-38 | Tỉnh: xoá tỉnh đang được khu vực sử dụng bị chặn, báo lỗi và vẫn còn trong danh sách | Tỉnh/Thành phố | /category/province', async ({ page }) => {
  const ctx = await apiContext(token)
  const prov = (await (await ctx.get('/api/Provinces/list?page=1&pageSize=1&name=TEST_PG02')).json()).data.items[0]
  await ctx.post('/api/Areas', { multipart: { code: 'TEST_AREAUSE', name: 'TEST_KV dùng tỉnh', mapType: '1', status: '1', provinceId: String(prov.id) } })
  await ctx.dispose()
  await openPage(page, ROUTE)
  const row = await findRow(page, 'TEST_PG02')
  await row.getByRole('button', { name: '🗑' }).click()
  await confirmDelete(page)
  await expect(page.locator('.el-message').filter({ hasText: /đang được khu vực sử dụng/ }).first()).toBeVisible()
  await expect(page.locator('tr', { hasText: 'TEST_PG02' }).first()).toBeVisible()
  await snap(page)
})
test('TC-08-39 | Khu vực: ô chọn Tỉnh liệt kê các tỉnh đã tạo | Danh sách khu vực | /category/area', async ({ page }) => {
  await openPage(page, '/category/area')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: /^Tỉnh$/ }) }).first()
  await item.locator('.el-select').click()
  await expect(page.locator('.el-select-dropdown__item:visible', { hasText: 'TEST_Tỉnh phân trang' }).first()).toBeVisible()
  await snap(page)
})
