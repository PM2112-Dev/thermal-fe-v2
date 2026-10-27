import request from '@/plugins/axios'

// ---- Mô hình AI ----
export const getAiModelsApi = (): Promise<IResponse<any[]>> => request.get({ url: '/api/ai/models' })
export const getAiModelFilesApi = (): Promise<IResponse<string[]>> => request.get({ url: '/api/ai/models/files' })
export const inspectAiModelApi = (path: string): Promise<IResponse<any>> =>
  request.get({ url: '/api/ai/models/inspect', params: { path } })
export const addAiModelApi = (data: object): Promise<IResponse> => request.post({ url: '/api/ai/models', data })
export const editAiModelApi = (id: number, data: object): Promise<IResponse> =>
  request.put({ url: `/api/ai/models/${id}`, data })
export const deleteAiModelApi = (id: number): Promise<IResponse> => request.delete({ url: `/api/ai/models/${id}` })

// ---- Chức năng AI ----
export const getAiFeaturesApi = (): Promise<IResponse<any[]>> => request.get({ url: '/api/ai/features' })
export const addAiFeatureApi = (data: object): Promise<IResponse> => request.post({ url: '/api/ai/features', data })
export const editAiFeatureApi = (code: string, data: object): Promise<IResponse> =>
  request.put({ url: `/api/ai/features/${encodeURIComponent(code)}`, data })
export const deleteAiFeatureApi = (code: string): Promise<IResponse> =>
  request.delete({ url: `/api/ai/features/${encodeURIComponent(code)}` })

// ---- Vùng giám sát theo camera ----
export const getAiZonesApi = (cameraId: number): Promise<IResponse<any[]>> =>
  request.get({ url: '/api/ai/zones', params: { cameraId } })
export const addAiZoneApi = (data: object): Promise<IResponse> => request.post({ url: '/api/ai/zones', data })
export const editAiZoneApi = (id: number, data: object): Promise<IResponse> =>
  request.put({ url: `/api/ai/zones/${id}`, data })
export const deleteAiZoneApi = (id: number): Promise<IResponse> => request.delete({ url: `/api/ai/zones/${id}` })

// Luật phải khớp RULES bên camera_ai (ai_services/rules.py)
export const AI_RULE_TYPES = [
  'presence',
  'in_zone',
  'zone_enter',
  'zone_exit',
  'line_cross',
  'count',
  'distance',
  'absence',
]
