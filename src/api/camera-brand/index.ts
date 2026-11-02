import request from '@/plugins/axios'

// Danh mục hãng camera + trạng thái plugin kết nối của từng hãng
export const getCameraBrandsApi = (): Promise<IResponse<any[]>> => {
  return request.get({ url: '/api/camera-brands' })
}

export const addCameraBrandApi = (data: object): Promise<IResponse> => {
  return request.post({ url: '/api/camera-brands', data })
}

export const editCameraBrandApi = (id: number, data: object): Promise<IResponse> => {
  return request.put({ url: `/api/camera-brands/${id}`, data })
}

export const deleteCameraBrandApi = (id: number): Promise<IResponse> => {
  return request.delete({ url: `/api/camera-brands/${id}` })
}

// Trạng thái plugin đã nạp (phiên bản contract, lỗi nạp)
export const getCameraPluginsApi = (): Promise<IResponse<any>> => {
  return request.get({ url: '/api/camera-plugins' })
}
