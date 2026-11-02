import request from '@/plugins/axios'

export const getAllCamerasApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({url: '/api/Cameras/All', params: searchParams})
}

export const getAllTreeCameraApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({url: '/api/Cameras/allTree', params: searchParams})
}

export const getCameraListApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({url: '/api/Cameras/list', params: searchParams})
}

export const getCameraDetailApi = (id: any): Promise<IResponse<[]>> => {
  return request.get({url: `api/Cameras/${id}`})
}
export const getVisionPresetsApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({url: '/api/cameras/visionPresets', params: searchParams})
}

export const addCameraApi = (data: any): Promise<IResponse> => {
  return request.post({url: 'api/Cameras', data})
}

export const editCameraApi = (id: number, data: any): Promise<IResponse> => {
  return request.put({url: `api/Cameras/${id}`, data})
}

export const deleteCameraApi = (id: number): Promise<IResponse> => {
  return request.delete({url: `api/Cameras/${id}`})
}

export const setViewingAngleApi = (id: number, data: any): Promise<IResponse> => {
  return request.put({url: `api/Cameras/${id}`, data})
}

export const getStreamApi = (id: any): Promise<IResponse> => {
  return request.get({url: `api/Cameras/stream/${id}`})
}

export const getStreamTicketApi = (id: string | number): Promise<IResponse<string>> => {
  return request.post({url: `api/CameraStreams/${encodeURIComponent(id)}/ticket`})
}

export const syncPresetsApi = (id: any): Promise<IResponse> => {
  return request.post({url: `api/Cameras/syncPresets/${id}`})
}

export const listPresetsApi = (id: any): Promise<IResponse> => {
  return request.get({url: `api/Cameras/presets/${id}`})
}

// Nguồn thiết lập PTZ: 0 = Auto (API hãng → ONVIF), 1 = chỉ API hãng, 2 = chỉ ONVIF
export type PtzSetupSource = 0 | 1 | 2

/** Vùng đo nhiệt trên camera, toạ độ chuẩn hoá 0..1. shape: 1 đường, 3 chữ nhật, 4 đa giác, 5 điểm. */
export interface ThermalAreaDto {
  areaId: number | null
  name: string
  shape: number
  points: { x: number; y: number }[]
}

export interface ThermalAreaListDto {
  areas: ThermalAreaDto[]
  maxAreas: number | null
  shapes: number[]
}

export const sendCommandCameraApi = (params: object): Promise<IResponse> => {
  return request.post({url: 'api/Cameras/control', data: params})
}
export const playTourApi = (data: object): Promise<IResponse> => {
  return request.post({url: '/api/cameras/tourCommand', data: data})
}

export const visionPresetApi = (data: any): Promise<IResponse> => {
  return request.post({url: '/api/cameras/visionPresets', data: data})
}

export const invokePresetApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({url: '/api/cameras/invokePreset', params: searchParams})
}

export const getAiServicesApi = (params: object): Promise<IResponse> => {
  return request.get({url: '/api/Cameras/aiservices', params: params})
}

export const getTourList = (params: object): Promise<IResponse> => {
  return request.get({url: '/api/Cameras/tourList', params: params})
}

export const addTour = (data: object): Promise<IResponse> => {
  return request.post({url: '/api/Cameras/addTour', data: data})
}

export const apiDeleteTour = (data: object): Promise<IResponse> => {
  return request.delete({url: '/api/Cameras/deleteTour', data: data})
}

export const deletePreset = (presetId: string | number, data: object): Promise<IResponse> => {
  return request.delete({url: `/api/Cameras/deletePreset/${presetId}`, data: data})
}

export const presetList = (params: object): Promise<IResponse> => {
  return request.get({url: '/api/Cameras/presetList', params: params})
}

export const getAllPresetList = (cameraId: string | number): Promise<IResponse> => {
  return request.get({url: '/api/Cameras/Presets/All/' + cameraId,})
}

export const saveAiServicesApi = (data: any): Promise<IResponse> => {
  return request.post({url: `/api/cameras/aiservices`, data: data})
}

export const addPreset = (data: any): Promise<IResponse> => {
  return request.post({url: 'api/Cameras/addPreset', data: data})
}

// ---- Quản lý góc quay / tour / vùng đo nhiệt kiểu forest: thao tác TRỰC TIẾP trên camera qua plugin, ----
// ---- sau mỗi lần lưu backend đồng bộ lại từ camera và trả CameraTourPresetInfo (presets + cameraTours). ----
// source: 0 = Auto (API hãng nếu có, không thì ONVIF), 1 = chỉ API hãng, 2 = chỉ ONVIF.
export const savePresetApi = (cameraId: string | number, data: object): Promise<IResponse> => {
  return request.post({url: `/api/Cameras/${cameraId}/presets`, data})
}

export const removePresetApi = (cameraId: string | number, presetId: number, source = 0): Promise<IResponse> => {
  return request.delete({url: `/api/Cameras/${cameraId}/presets/${presetId}`, params: {source}})
}

export const getTourSpeedApi = (cameraId: string | number, source = 0): Promise<IResponse> => {
  return request.get({url: `/api/Cameras/${cameraId}/tour-speed`, params: {source}})
}

export const saveTourApi = (cameraId: string | number, data: object): Promise<IResponse> => {
  return request.post({url: `/api/Cameras/${cameraId}/tours`, data})
}

export const removeTourApi = (cameraId: string | number, tourId: number, source = 0): Promise<IResponse> => {
  return request.delete({url: `/api/Cameras/${cameraId}/tours/${tourId}`, params: {source}})
}

export const getThermalAreasApi = (cameraId: string | number, presetId: number): Promise<IResponse> => {
  return request.get({url: `/api/Cameras/${cameraId}/presets/${presetId}/thermal-areas`})
}

export const saveThermalAreaApi = (cameraId: string | number, presetId: number, data: object): Promise<IResponse> => {
  return request.post({url: `/api/Cameras/${cameraId}/presets/${presetId}/thermal-areas`, data})
}

export const removeThermalAreaApi = (cameraId: string | number, presetId: number, areaId: number): Promise<IResponse> => {
  return request.delete({url: `/api/Cameras/${cameraId}/presets/${presetId}/thermal-areas/${areaId}`})
}

export const exportCameraIECApi = (searchParams: object): Promise<IResponse<[]>> => {
  return request.get({
    url: '/api/Cameras/exportCameras',
    params: searchParams,
    responseType: 'blob'
  })
}

export const importCameraIECApi = (data: any): Promise<IResponse> => {
  return request.post({
    url: '/api/Cameras/importIEC', data, headers: {'Content-Type': 'multipart/form-data'}
  })
}

// ---- Hướng camera (la bàn) ----
export const getCameraDirectionApi = (id: number): Promise<IResponse<any>> => {
  return request.get({url: `api/Cameras/${id}/direction`})
}

export const saveCameraDirectionApi = (id: number, data: { heading: number; panInverted: boolean }): Promise<IResponse<any>> => {
  return request.put({url: `api/Cameras/${id}/direction`, data})
}

// ---- Cảnh báo cháy/khói bật trên camera qua API hãng ----
export const getCameraFireAlarmApi = (id: number): Promise<IResponse<any>> => {
  return request.get({url: `api/Cameras/${id}/fire-alarm`})
}

export const saveCameraFireAlarmApi = (id: number, data: object): Promise<IResponse<any>> => {
  return request.put({url: `api/Cameras/${id}/fire-alarm`, data})
}
