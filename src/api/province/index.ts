import request from '@/plugins/axios'

export const getAllProvinceApi = (): Promise<IResponse<[]>> => {
  return request.get({ url: '/api/Provinces/all' })
}
export const getProvinceListApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({ url: '/api/Provinces/list', params: searchParams })
}

export const getDetailProvinceApi = (id: number): Promise<IResponse> => {
  return request.get({ url: `api/Provinces/${id}` })
}

export const addProvinceApi = (data: Object): Promise<IResponse> => {
  return request.post({ url: 'api/Provinces', data })
}

export const editProvinceApi = (id: number, data: Object): Promise<IResponse> => {
  return request.put({ url: `api/Provinces/${id}`, data })
}

export const deleteProvinceApi = (id: number): Promise<IResponse> => {
  return request.delete({ url: `api/Provinces/${id}` })
}
