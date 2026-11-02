import { test, expect } from '@playwright/test'
import { adminToken, apiContext, login, PASSWORD } from './helpers/api'

// Nhóm 14: API và ràng buộc dữ liệu (không qua giao diện)
const PRODUCER_TOKEN = process.env.E2E_PRODUCER_TOKEN // Producer:Token của Web; không đặt thì bỏ qua các test dùng token này
let token = ''
test.beforeAll(async () => { token = await adminToken() })

test('TC-14-01 | API: gọi không kèm token bị từ chối (401) | Bảo mật API | /api/Provinces/list', async () => {
  const ctx = await apiContext()
  for (const url of ['/api/Provinces/list', '/api/Areas/list', '/api/Cameras/list', '/api/Users/list']) {
    expect((await ctx.get(url)).status(), url).toBe(401)
  }
  await ctx.dispose()
})
test('TC-14-02 | API: đăng nhập sai mật khẩu trả lỗi, đúng mật khẩu trả token | Xác thực | /api/Auth/login', async () => {
  const bad = await login('admin', 'SaiMatKhau@999')
  expect(bad).toBeNull()
  expect(await login('admin', PASSWORD)).toBeTruthy()
})
test('TC-14-03 | Tỉnh: thêm thiếu mã/tên bị từ chối (400) | Tỉnh/Thành phố | /api/Provinces', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Provinces', { data: { code: '', name: '' } })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(Object.keys(body.errors ?? {})).toEqual(expect.arrayContaining(['Code', 'Name']))
  await ctx.dispose()
})
test('TC-14-04 | Tỉnh: trùng mã bị từ chối với thông báo "Mã đã tồn tại" | Tỉnh/Thành phố | /api/Provinces', async () => {
  const ctx = await apiContext(token)
  const first = await ctx.post('/api/Provinces', { data: { code: 'TEST_DUP', name: 'TEST_Tỉnh trùng' } })
  expect(first.status()).toBe(200)
  const dup = await ctx.post('/api/Provinces', { data: { code: 'TEST_DUP', name: 'TEST_Tỉnh trùng 2' } })
  expect(dup.status()).toBe(400)
  expect((await dup.json()).message).toContain('Mã đã tồn tại')
  await ctx.dispose()
})
test('TC-14-05 | Tỉnh: mã và tên được cắt khoảng trắng đầu/cuối khi lưu | Tỉnh/Thành phố | /api/Provinces', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Provinces', { data: { code: '  TEST_TRIM  ', name: '  TEST_Tỉnh cắt  ' } })
  expect(res.status()).toBe(200)
  const d = (await res.json()).data
  expect(d.code).toBe('TEST_TRIM'); expect(d.name).toBe('TEST_Tỉnh cắt')
  await ctx.dispose()
})
test('TC-14-06 | Tỉnh: mã dài quá 50 ký tự bị từ chối | Tỉnh/Thành phố | /api/Provinces', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Provinces', { data: { code: 'TEST_' + 'x'.repeat(60), name: 'TEST_dài' } })
  expect(res.status()).toBe(400)
  await ctx.dispose()
})
test('TC-14-07 | Tỉnh: tìm kiếm theo mã hoặc tên và phân trang | Tỉnh/Thành phố | /api/Provinces/list', async () => {
  const ctx = await apiContext(token)
  const byCode = (await (await ctx.get('/api/Provinces/list?page=1&pageSize=10&name=TEST_DUP')).json()).data
  expect(byCode.totalRow).toBeGreaterThanOrEqual(1)
  const byName = (await (await ctx.get(`/api/Provinces/list?page=1&pageSize=1&name=${encodeURIComponent('TEST_Tỉnh')}`)).json()).data
  expect(byName.pageSize).toBe(1); expect(byName.items.length).toBe(1)
  await ctx.dispose()
})
test('TC-14-08 | Tỉnh: không xoá được tỉnh đang được khu vực sử dụng | Tỉnh/Thành phố | /api/Provinces/{id}', async () => {
  const ctx = await apiContext(token)
  const prov = (await (await ctx.post('/api/Provinces', { data: { code: 'TEST_INUSE', name: 'TEST_Tỉnh đang dùng' } })).json()).data
  const area = await ctx.post('/api/Areas', { multipart: { code: 'TEST_AREAPROV', name: 'TEST_KV tỉnh', mapType: '1', status: '1', provinceId: String(prov.id) } })
  expect(area.status()).toBe(200)
  const del = await ctx.delete(`/api/Provinces/${prov.id}`)
  expect(del.status()).toBe(400)
  expect((await del.json()).message).toContain('đang được khu vực sử dụng')
  await ctx.dispose()
})
test('TC-14-09 | Khu vực: chọn tỉnh được lưu vào province_id và đọc lại đúng | Danh sách khu vực | /api/Areas', async () => {
  const ctx = await apiContext(token)
  const prov = (await (await ctx.get('/api/Provinces/list?page=1&pageSize=1&name=TEST_INUSE')).json()).data.items[0]
  const list = (await (await ctx.get('/api/Areas/list?page=1&pageSize=50&name=TEST_KV')).json()).data.items
  const area = list.find((a: any) => a.code === 'TEST_AREAPROV')
  expect(area?.provinceId).toBe(prov.id)
  await ctx.dispose()
})
test('TC-14-10 | Camera AI: cameraVisionsByAreas với danh sách khu vực rỗng trả về tất cả camera | Camera | /api/Cameras/cameraVisionsByAreas', async () => {
  test.skip(!PRODUCER_TOKEN, 'Đặt E2E_PRODUCER_TOKEN (= Producer:Token) để chạy test này')
  const ctx = await apiContext()
  const res = await ctx.post('/api/Cameras/cameraVisionsByAreas', { data: { token: PRODUCER_TOKEN, areaIds: [], cameraType: 'Normal' } })
  expect(res.status()).toBe(200)
  expect((await res.json()).data.length).toBeGreaterThan(0)
  await ctx.dispose()
})
test('TC-14-11 | Camera AI: token sai bị từ chối | Camera | /api/Cameras/cameraVisionsByAreas', async () => {
  const ctx = await apiContext()
  const res = await ctx.post('/api/Cameras/cameraVisionsByAreas', { data: { token: 'sai-token', areaIds: [], cameraType: 'Normal' } })
  expect(res.status()).toBe(400)
  await ctx.dispose()
})
test('TC-14-12 | Server AI: Web gọi được camera_ai lấy danh sách file mô hình | Quản lý AI | /api/ai/models/files', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.get('/api/ai/models/files')
  expect(res.status()).toBe(200)
  expect(Array.isArray((await res.json()).data)).toBe(true)
  await ctx.dispose()
})
test('TC-14-13 | Cảnh báo AI: mọi ảnh trong danh sách có URL truy cập được (HTTP 200) | Cảnh báo AI | /api/VisionNotifications/list', async () => {
  const ctx = await apiContext(token)
  const items = (await (await ctx.get('/api/VisionNotifications/list?fromTime=2020-01-01T00:00:00&toTime=2099-01-01T00:00:00&page=1&pageSize=20')).json()).data.items
  expect(items.length).toBeGreaterThan(0)
  for (const i of items) expect((await ctx.get(i.imagePath)).status(), i.imagePath).toBe(200)
  await ctx.dispose()
})
test('TC-14-14 | Cảnh báo PD: mọi ảnh trong danh sách có URL truy cập được (HTTP 200) | Cảnh báo phóng điện (PD) | /api/Notifications/list', async () => {
  const ctx = await apiContext(token)
  const items = (await (await ctx.get('/api/Notifications/list?fromTime=2020-01-01T00:00:00&toTime=2099-01-01T00:00:00&page=1&pageSize=20')).json()).data.items
  expect(items.length).toBeGreaterThan(0)
  for (const i of items.filter((x: any) => x.imagePath)) expect((await ctx.get(i.imagePath)).status(), i.imagePath).toBe(200)
  await ctx.dispose()
})
test('TC-14-15 | Camera: đồng bộ preset camera không tồn tại trả lỗi (không 500) | Camera | /api/Cameras/syncPresets/{id}', async () => {
  const ctx = await apiContext(token)
  const res = await ctx.post('/api/Cameras/syncPresets/999999')
  expect([400, 404]).toContain(res.status())
  await ctx.dispose()
})
