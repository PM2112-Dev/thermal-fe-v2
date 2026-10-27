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
