// Một số API danh mục trả cả danh sách (không phân trang) — bọc lại thành dạng ListTemplate/useTable cần:
// lọc theo từ khoá ở client rồi cắt trang.
export const localPagedFetch =
  (loader: () => Promise<{ data?: any[] }>, keys: string[] = ['code', 'name']) =>
  async (params: Record<string, any> = {}) => {
    const res = await loader()
    const keyword = String(params.keyword ?? params.name ?? '').trim().toLowerCase()
    const all = (res?.data ?? []).filter(
      (row) => !keyword || keys.some((k) => String(row?.[k] ?? '').toLowerCase().includes(keyword)),
    )
    const pageSize = Number(params.pageSize) || 10
    const page = Number(params.page) || 1
    const start = (page - 1) * pageSize
    return {
      ...res,
      data: {
        items: all.slice(start, start + pageSize),
        totalRow: all.length,
        pageSize,
        rowIndex: all.length ? start + 1 : 0,
        lastRowIndex: Math.min(start + pageSize, all.length),
      },
    }
  }
