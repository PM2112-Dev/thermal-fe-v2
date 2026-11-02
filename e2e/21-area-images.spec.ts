import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { openPage, dialog, saveDialog, snap } from './helpers'
import { adminToken, apiContext } from './helpers/api'

const fx = (f: string) => path.resolve(process.cwd(), 'e2e/fixtures', f)
let token = ''
let areaId = 0
const CODE = 'TEST_IMGAREA'

test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  token = await adminToken()
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Areas', { multipart: { code: CODE, name: 'TEST_Khu vực ảnh', mapType: '2', status: '1' } })
  areaId = (await res.json()).data.id
  await ctx.dispose()
})

async function openEdit(page: import('@playwright/test').Page) {
  await openPage(page, '/category/area')
  await page.locator('tr', { hasText: 'TEST_Khu vực ảnh' }).first().getByRole('button', { name: '✎' }).click()
  await expect(dialog(page)).toBeVisible()
  await page.waitForTimeout(800)
}

test('TC-08-20 | Khu vực: tải ảnh sơ đồ một sợi, lưu và không phát sinh lỗi upload 404 | Danh sách khu vực | /category/area', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await openEdit(page)
  await dialog(page).locator('input[type=file]').nth(0).setInputFiles(fx('sodo.png'))
  await expect(dialog(page).locator('img[alt="Preview"]')).toBeVisible()
  await snap(page, 'form')
  const put = page.waitForResponse((r) => r.url().includes('/api/Areas/') && r.request().method() === 'PUT')
  await saveDialog(page)
  expect((await put).status()).toBe(200)
  await page.waitForTimeout(1200)
  expect(errors.filter((e) => /UploadAjaxError|fail to post/.test(e)), 'Còn lỗi upload tự động lên "#"').toHaveLength(0)
  await snap(page)
})
test('TC-08-21 | Khu vực: URL ảnh sơ đồ đã lưu truy cập được (HTTP 200, đúng loại ảnh) | Danh sách khu vực | /category/area', async () => {
  const ctx = await apiContext(token)
  const area = (await (await ctx.get(`/api/Areas/${areaId}`)).json()).data
  expect(area.photoPath, 'Chưa có photoPath').toBeTruthy()
  const img = await ctx.get(area.photoPath)
  expect(img.status()).toBe(200)
  expect(img.headers()['content-type']).toContain('image/png')
  await ctx.dispose()
})
test('TC-08-22 | Khu vực: mở lại form sửa hiển thị ảnh sơ đồ đã lưu | Danh sách khu vực | /category/area', async ({ page }) => {
  await openEdit(page)
  await expect(dialog(page).locator('img[alt="Preview"]')).toBeVisible()
  await snap(page)
})
test('TC-08-23 | Khu vực: xoá ảnh sơ đồ khỏi form rồi lưu thì ảnh bị gỡ | Danh sách khu vực | /category/area', async ({ page }) => {
  await openEdit(page)
  await dialog(page).locator('button.el-button--info.is-circle').click()
  await expect(dialog(page).locator('img[alt="Preview"]')).toHaveCount(0)
  await saveDialog(page)
  await page.waitForTimeout(1500)
  const ctx = await apiContext(token)
  const area = (await (await ctx.get(`/api/Areas/${areaId}`)).json()).data
  expect(area.photoPath ?? null).toBeNull()
  await ctx.dispose()
  await snap(page)
})
test('TC-08-24 | Khu vực: tải file mặt bằng 3D (.glb) và lưu thành công | Danh sách khu vực | /category/area', async ({ page }) => {
  await openEdit(page)
  await dialog(page).locator('input[type=file]').nth(1).setInputFiles(fx('mattbang.glb'))
  await page.waitForTimeout(500)
  await snap(page, 'form')
  const put = page.waitForResponse((r) => r.url().includes('/api/Areas/') && r.request().method() === 'PUT')
  await saveDialog(page)
  expect((await put).status()).toBe(200)
  const ctx = await apiContext(token)
  const area = (await (await ctx.get(`/api/Areas/${areaId}`)).json()).data
  expect(area.emapPhotoPath).toMatch(/\.glb/)
  expect((await ctx.get(area.emapPhotoPath)).status()).toBe(200)
  await ctx.dispose()
  await snap(page)
})
test('TC-08-25 | Khu vực: file ảnh sai định dạng (.gif) bị máy chủ từ chối | Danh sách khu vực | /api/Areas', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Areas', { multipart: { code: 'TEST_IMGGIF', name: 'TEST_gif', mapType: '2', status: '1', photoFile: { name: 'a.gif', mimeType: 'image/gif', buffer: fs.readFileSync(fx('khong-hop-le.gif')) } } })
  expect(res.status()).toBe(400)
  await ctx.dispose()
})
