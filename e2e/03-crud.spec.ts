import { test, expect, Page } from '@playwright/test'
import { openPage, fillItem, saveDialog, dialog, snap, findRow, confirmDelete } from './helpers'

type Field = [label: string, value?: string]
interface Entity {
  key: string; group: string; name: string; route: string; screen: string
  searchText: string          // chuỗi duy nhất để tìm hàng
  fields: Field[]             // dữ liệu tạo mới
  nameLabel: string           // trường dùng để sửa
  nameValue: string
  extra?: (page: Page) => Promise<void>   // bước điền thêm cho trường đặc biệt
}

const PW = 'Test@12345'
const entities: Entity[] = [
  { key: 'province', group: '08', name: 'Tỉnh/Thành phố', route: '/category/province', screen: 'Danh sách tỉnh/thành phố', searchText: 'TEST_Tỉnh',
    fields: [['Mã tỉnh', 'TEST_PROV'], ['Tên tỉnh/thành phố', 'TEST_Tỉnh']], nameLabel: 'Tên tỉnh/thành phố', nameValue: 'TEST_Tỉnh' },
  { key: 'area', group: '08', name: 'Khu vực', route: '/category/area', screen: 'Danh sách khu vực', searchText: 'TEST_Khu vực',
    fields: [['Tỉnh', 'TEST_Tỉnh'], ['Mã khu vực', 'TEST_AREA'], ['Tên khu vực', 'TEST_Khu vực'], ['Loại bản đồ']], nameLabel: 'Tên khu vực', nameValue: 'TEST_Khu vực' },
  { key: 'brand', group: '09', name: 'Hãng camera', route: '/category/camera-brand', screen: 'Hãng camera', searchText: 'TEST_Hãng',
    fields: [['Mã hãng', 'TEST_BRAND'], ['Tên hãng', 'TEST_Hãng']], nameLabel: 'Tên hãng', nameValue: 'TEST_Hãng' },
  { key: 'mtype', group: '10', name: 'Loại thiết bị', route: '/category/machine-type', screen: 'Loại thiết bị', searchText: 'TEST_Loại',
    fields: [['Tên loại thiết bị', 'TEST_Loại TB'], ['Mã loại thiết bị', 'TEST_MTYPE']], nameLabel: 'Tên loại thiết bị', nameValue: 'TEST_Loại TB' },
  { key: 'camera', group: '09', name: 'Camera', route: '/category/camera-list', screen: 'Danh sách camera', searchText: 'TEST_Camera',
    fields: [['Mã camera', 'TEST_CAM'], ['Tên camera', 'TEST_Camera'], ['Khu vực', 'TEST_Khu vực'], ['Chức năng camera'], ['Loại camera'], ['Hãng camera'], ['Đường dẫn camera', 'rtsp://192.168.250.10:554/test'], ['Địa chỉ IP (LAN)', '192.168.250.10:554'], ['Địa chỉ IP (WAN)', '192.168.250.10:554']], nameLabel: 'Tên camera', nameValue: 'TEST_Camera' },
  { key: 'sensor', group: '10', name: 'Cảm biến', route: '/category/camera-sensor', screen: 'Danh sách cảm biến', searchText: 'TEST_Cảm biến',
    fields: [['Mã cảm biến', 'TEST_SENSOR'], ['Tên cảm biến', 'TEST_Cảm biến'], ['Khu vực', 'TEST_Khu vực'], ['Địa chỉ IP (WAN)', '192.168.250.20'], ['Nguồn nhiệt'], ['Loại cảm biến']], nameLabel: 'Tên cảm biến', nameValue: 'TEST_Cảm biến' },
  { key: 'machine', group: '10', name: 'Thiết bị', route: '/category/machine-list', screen: 'Danh sách thiết bị', searchText: 'TEST_Thiết bị',
    fields: [['Khu vực', 'TEST_Khu vực'], ['Mã thiết bị', 'TEST_MACHINE'], ['Chu kỳ lấy data (phút)', '5'], ['Tên thiết bị', 'TEST_Thiết bị'], ['Loại thiết bị', 'TEST_Loại TB']], nameLabel: 'Tên thiết bị', nameValue: 'TEST_Thiết bị' },
  { key: 'user', group: '08', name: 'Người dùng', route: '/category/user', screen: 'Danh sách người dùng', searchText: 'TEST_Tên',
    fields: [['Tên đăng nhập', 'test_user01'], ['Mật khẩu', PW], ['Tên', 'TEST_Tên'], ['Họ và tên đệm', 'TEST_Họ'], ['Email', 'test_user01@example.com'], ['Số điện thoại', '0900000001'], ['Quyền']], nameLabel: 'Tên', nameValue: 'TEST_Tên' },
  { key: 'channel', group: '07', name: 'Kênh cảnh báo', route: '/setting/notification-channel', screen: 'Kênh thông báo', searchText: 'TEST_Kênh',
    fields: [['Tên kênh cảnh báo', 'TEST_Kênh'], ['Mã cảnh báo', 'TEST_CHANNEL'], ['Nơi nhận cảnh báo'], ['Người dùng', 'TEST_Tên']], nameLabel: 'Tên kênh cảnh báo', nameValue: 'TEST_Kênh' },
  { key: 'group', group: '07', name: 'Nhóm cảnh báo', route: '/setting/notification-group', screen: 'Nhóm thông báo', searchText: 'TEST_Nhóm',
    fields: [['Bộ cảnh báo', 'TEST_Nhóm'], ['Mã cảnh báo', 'TEST_GROUP'], ['Kênh cảnh báo'], ['Sự kiện'], ['Khu vực', 'TEST_Khu vực']], nameLabel: 'Bộ cảnh báo', nameValue: 'TEST_Nhóm',
    extra: async (page) => {
      const ins = dialog(page).locator('.el-form-item').filter({ hasText: 'Thời gian cảnh báo' }).locator('input')
      await ins.nth(0).fill('08:00'); await ins.nth(0).press('Enter')
      await ins.nth(1).fill('17:00'); await ins.nth(1).press('Enter')
      await dialog(page).locator('.el-dialog__header, h3').first().click()
    } },
  { key: 'formula', group: '11', name: 'Công thức', route: '/category/settings', screen: 'Cấu hình công thức', searchText: 'TEST_Công thức',
    fields: [['Tên công thức', 'TEST_Công thức'], ['Mã công thức', 'TEST_FORMULA']], nameLabel: 'Tên công thức', nameValue: 'TEST_Công thức',
    extra: async (page) => {
      const ed = dialog(page).locator('.formula-form__input')
      await ed.click(); await ed.pressSequentially('(1 + 1) * 100')
    } },
]

let n: Record<string, number> = {}
const id = (e: Entity) => { n[e.group] = (n[e.group] ?? 0) + 1; return `TC-${e.group}-${String(n[e.group]).padStart(2, '0')}` }
const title = (e: Entity, fn: string) => `${id(e)} | ${fn} | ${e.screen} | ${e.route}`

test.describe.configure({ mode: 'serial' })

// Pha 1: mở màn hình + thêm mới (theo thứ tự phụ thuộc)
for (const e of entities) {
  test(title(e, `Xem danh sách ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    await expect(page.locator('table').first()).toBeVisible()
    await snap(page)
  })
  test(title(e, `Kiểm tra bắt buộc nhập khi thêm ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    await page.locator('button', { hasText: 'Thêm' }).first().click()
    await expect(dialog(page)).toBeVisible()
    await saveDialog(page)
    await expect(dialog(page).locator('.el-form-item__error').first()).toBeVisible()
    await snap(page)
  })
  test(title(e, `Thêm mới ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    await page.locator('button', { hasText: 'Thêm' }).first().click()
    await expect(dialog(page)).toBeVisible()
    for (const [l, v] of e.fields) await fillItem(page, l, v)
    if (e.extra) await e.extra(page)
    await snap(page, 'form')
    await saveDialog(page)
    await expect(page.locator('.el-message').filter({ hasText: /thành công/i }).first()).toBeVisible()
    await page.waitForTimeout(800)
    await snap(page)
  })
}

// Pha 2: tìm kiếm + sửa
for (const e of entities) {
  test(title(e, `Tìm kiếm ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    const box = page.locator('input.el-input__inner:not([readonly]):visible').first()
    await box.fill(e.searchText)
    await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
    await page.waitForTimeout(1500)
    await expect(page.locator('tr', { hasText: e.searchText }).first()).toBeVisible()
    await snap(page)
  })
  test(title(e, `Sửa ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    const row = await findRow(page, e.searchText)
    await row.getByRole('button', { name: '✎' }).click()
    await expect(dialog(page)).toBeVisible()
    await fillItem(page, e.nameLabel, e.nameValue + ' (sửa)')
    await snap(page, 'form')
    await saveDialog(page)
    await expect(page.locator('.el-message').filter({ hasText: /thành công/i }).first()).toBeVisible()
    await page.waitForTimeout(800)
    await expect(await findRow(page, e.nameValue + ' (sửa)')).toBeVisible()
    await snap(page)
  })
}

// Pha 3: xoá theo thứ tự ngược để không vướng ràng buộc
for (const e of [...entities].reverse()) {
  test(title(e, `Xoá ${e.name}`), async ({ page }) => {
    await openPage(page, e.route)
    const row = await findRow(page, e.searchText)
    await row.getByRole('button', { name: '🗑' }).click()
    await expect(page.locator('.el-message-box:visible')).toBeVisible()
    await snap(page, 'confirm')
    await confirmDelete(page)
    await page.waitForTimeout(1500)
    await expect(page.locator('tr', { hasText: e.searchText })).toHaveCount(0)
    await snap(page)
  })
}
