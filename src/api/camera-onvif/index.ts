import request from '@/plugins/axios'

export const getCameraOnvifListApi = (): Promise<IResponse<any[]>> => request.get({ url: '/api/camera-onvif' })

export const getCameraOnvifApi = (id: number): Promise<IResponse<any>> => request.get({ url: `/api/camera-onvif/${id}` })

// mode: 0 = Tự động, 1 = Bật, 2 = Tắt
export const saveCameraOnvifSettingsApi = (id: number, data: { mode: number; port?: number | null }): Promise<IResponse<any>> =>
  request.put({ url: `/api/camera-onvif/${id}/settings`, data })

export const checkCameraOnvifApi = (id: number): Promise<IResponse<any>> =>
  request.post({ url: `/api/camera-onvif/${id}/check` })

export const saveCameraOnvifDeviceApi = (id: number, data: object): Promise<IResponse<any>> =>
  request.put({ url: `/api/camera-onvif/${id}/device`, data })
