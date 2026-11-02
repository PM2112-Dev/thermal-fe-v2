import { Page, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const EVIDENCE = path.resolve(process.cwd(), 'e2e/evidence')

/** Mở màn hình; tự tắt hộp thoại "Hãy cho phép thiết bị bật âm thanh" bất cứ lúc nào nó xuất hiện. */
export async function openPage(page: Page, route: string) {
  await page.addLocatorHandler(
    page.getByRole('dialog', { name: 'Thông báo' }).filter({ hasText: 'âm thanh' }),
    async (box) => {
      await box.getByRole('button', { name: 'Đóng', exact: true }).click()
    },
  )
  await page.goto(route)
  await page.waitForTimeout(2500)
}

/** Chụp ảnh bằng chứng: e2e/evidence/<nhóm>/<id>.png */
export async function shot(page: Page, group: string, id: string) {
  const dir = path.join(EVIDENCE, group)
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${id}.png`) })
}

export const dialog = (page: Page) => page.locator('.el-dialog:visible, .el-drawer:visible').last()

export async function toast(page: Page) {
  return page.locator('.el-message').last()
}

/** Điền một dòng form theo nhãn: input/textarea → gõ; el-select → chọn theo chữ hoặc tuỳ chọn đầu tiên. */
export async function fillItem(page: Page, label: string, value?: string) {
  const item = dialog(page).locator('.el-form-item').filter({ has: page.locator('.el-form-item__label', { hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?\\s*$`) }) }).first()
  const select = item.locator('.el-select').first()
  if (await select.count()) {
    await page.locator('.el-select-dropdown__item:visible').first().waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {})
    await select.click()
    const opts = page.locator('.el-select-dropdown__item:visible')
    try { await opts.first().waitFor({ timeout: 6000 }) } catch { await page.keyboard.press('Escape'); return }  // danh sách rỗng: bỏ qua trường tuỳ chọn
    let target = value ? opts.filter({ hasText: value }).first() : opts.first()
    if (value && !(await target.count())) target = opts.first()
    await target.dispatchEvent('click').catch((e) => { throw new Error(`Không chọn được "${value ?? '(đầu tiên)'}" ở trường "${label}": ${String(e).split('\n')[0]}`) })
    await page.keyboard.press('Escape').catch(() => {})
    await opts.first().waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
    return
  }
  const input = item.locator('input:not([readonly]), textarea').first()
  await input.fill(value ?? '')
}

export async function saveDialog(page: Page) {
  await dialog(page).getByRole('button', { name: 'Lưu' }).click()
}

/** Ô lọc phía trên bảng theo nhãn. */
export function filterInput(page: Page, label: string) {
  return page.locator('label, .label, div').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first().locator('xpath=following::input[1]')
}

export async function confirmDelete(page: Page) {
  await page.locator('.el-message-box:visible').getByRole('button', { name: /Đồng ý|Xác nhận|OK|Xóa|Có/i }).first().click()
}

import { test } from '@playwright/test'

/** Chụp ảnh bằng chứng cho test đang chạy: e2e/evidence/<nhóm>/<TC>[-hậu tố].png và đính vào báo cáo. */
export async function snap(page: Page, suffix = '') {
  await page.waitForTimeout(600)  // đợi hiệu ứng mở drawer/hộp thoại kết thúc
  const info = test.info()
  const m = info.title.match(/^(TC-(\d\d)-\d+)/)
  const id = m ? m[1] : info.title.replace(/\W+/g, '_')
  const group = m ? m[2] : 'misc'
  const dir = path.join(EVIDENCE, group)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${id}${suffix ? '-' + suffix : ''}.png`)
  await page.screenshot({ path: file })
  await info.attach('evidence', { path: file, contentType: 'image/png' })
}

/** Hàng bảng chứa văn bản; ưu tiên tìm trực tiếp, nếu không có thì gõ vào ô tìm kiếm đầu tiên rồi bấm Tìm kiếm. */
export async function findRow(page: Page, text: string) {
  let row = page.locator('tr', { hasText: text }).first()
  if (await row.count()) return row
  const box = page.locator('input.el-input__inner:not([readonly]):visible').first()
  if (await box.count()) {
    await box.fill(text)
    await page.getByRole('button', { name: 'Tìm kiếm' }).first().click()
    await page.waitForTimeout(1500)
  }
  row = page.locator('tr', { hasText: text }).first()
  return row
}

/** Mở ô chọn (el-select) ở thanh lọc theo nhãn và trả về danh sách lựa chọn; đóng lại sau khi đọc. */
export async function filterOptions(page: Page, label: RegExp): Promise<string[]> {
  const item = page.locator('.filter-item').filter({ has: page.locator('.filter-label', { hasText: label }) }).first()
  await item.locator('.el-select').first().click()
  const opts = page.locator('.el-select-dropdown__item:visible')
  await opts.first().waitFor({ timeout: 5000 }).catch(() => {})
  const texts = (await opts.allInnerTexts()).map((s) => s.trim()).filter(Boolean)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return texts
}

export const tableRows = (page: Page) => page.locator('.el-table__body-wrapper tbody tr')
