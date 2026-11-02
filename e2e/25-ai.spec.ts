import { test, expect } from '@playwright/test'
import { openPage, dialog, fillItem, saveDialog, snap, findRow, confirmDelete } from './helpers'

// Nhóm 12: Quản lý AI - thêm/sửa/xoá mô hình và chức năng AI (không cần camera_ai thật cho thao tác lưu)
test.describe.configure({ mode: 'serial' })

test('TC-12-20 | AI: thêm mô hình AI thiếu trường bắt buộc bị chặn | Mô hình AI | /ai/model-list', async ({ page }) => {
  await openPage(page, '/ai/model-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  await saveDialog(page)
  await expect(dialog(page).locator('.el-form-item__error').first()).toBeVisible()
  await snap(page)
})
test('TC-12-21 | AI: danh sách mô hình hiển thị đủ cột mã, tên, loại tác vụ, ngưỡng tin cậy | Mô hình AI | /ai/model-list', async ({ page }) => {
  await openPage(page, '/ai/model-list')
  const heads = (await page.locator('thead th').allInnerTexts()).join('|')
  for (const h of ['Mã', 'Tên', 'Loại tác vụ', 'Ngưỡng tin cậy']) expect(heads).toContain(h)
  expect(await page.locator('.el-table__body-wrapper tbody tr').count()).toBeGreaterThan(0)
  await snap(page)
})
test('TC-12-22 | AI: danh sách chức năng AI hiển thị đủ cột và dữ liệu | Chức năng AI | /ai/feature-list', async ({ page }) => {
  await openPage(page, '/ai/feature-list')
  const heads = (await page.locator('thead th').allInnerTexts()).join('|')
  for (const h of ['Mã', 'Tên', 'Mô hình', 'Luật cảnh báo']) expect(heads).toContain(h)
  expect(await page.locator('.el-table__body-wrapper tbody tr').count()).toBeGreaterThan(0)
  await snap(page)
})
test('TC-12-23 | AI: mở form sửa chức năng AI hiển thị tham số mặc định (JSON) | Chức năng AI | /ai/feature-list', async ({ page }) => {
  await openPage(page, '/ai/feature-list')
  await page.locator('.el-table__body-wrapper tbody tr').first().getByRole('button', { name: '✎' }).click()
  await expect(dialog(page)).toBeVisible()
  await expect(dialog(page).getByText('Tham số mặc định (JSON)')).toBeVisible()
  await snap(page)
})
test('TC-12-24 | AI: thêm chức năng AI với mã có ký tự không hợp lệ bị từ chối | Chức năng AI | /ai/feature-list', async ({ page }) => {
  await openPage(page, '/ai/feature-list')
  await page.locator('button', { hasText: 'Thêm' }).first().click()
  await fillItem(page, 'Mã', 'TEST sai ma!')
  await fillItem(page, 'Tên', 'TEST_Chức năng')
  await saveDialog(page)
  await page.waitForTimeout(1200)
  // không lưu thành công: hộp thoại vẫn mở hoặc có thông báo lỗi
  await expect(dialog(page)).toBeVisible()
  await snap(page)
})
