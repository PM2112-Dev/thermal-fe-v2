import { APIRequestContext, request } from '@playwright/test'

export const API = process.env.E2E_API_URL ?? 'http://localhost:5272'
export const PASSWORD = process.env.E2E_PASSWORD ?? ''

export async function apiContext(token?: string): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API, extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {} })
}

export async function login(username: string, password: string): Promise<string | null> {
  const ctx = await apiContext()
  const res = await ctx.post('/api/Auth/login', { data: { username, password } })
  const body = await res.json().catch(() => null)
  await ctx.dispose()
  const d = body?.data
  if (!d) return null
  return d.accessToken ?? d.token ?? (Object.entries(d).find(([k]) => /token/i.test(k))?.[1] as string) ?? null
}

export async function adminToken(): Promise<string> {
  const t = await login(process.env.E2E_USER ?? 'admin', PASSWORD)
  if (!t) throw new Error('Không đăng nhập được bằng tài khoản admin (kiểm tra E2E_PASSWORD)')
  return t
}

/** Tạo người dùng test (tiền tố test_) với một vai trò; bỏ qua nếu đã tồn tại. */
export async function ensureUser(adminTok: string, username: string, roleCode: string, password = PASSWORD) {
  const ctx = await apiContext(adminTok)
  const roles = await (await ctx.get('/api/Roles/all')).json().catch(() => null)
  const list: any[] = roles?.data ?? []
  const role = list.find((r) => r.code?.toLowerCase() === roleCode.toLowerCase())
  if (!role) throw new Error(`Không thấy vai trò ${roleCode}`)
  const res = await ctx.post('/api/Users', {
    data: { username, password, firstName: 'TEST', lastMiddleName: username, email: `${username}@example.com`, status: 1, roles: [{ id: role.id, code: role.code, name: role.name }], areaIds: [] },
  })
  await ctx.dispose()
  return res.status()
}
