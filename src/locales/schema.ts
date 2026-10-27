// Chỉ dùng cho type-check: mọi ngôn ngữ phải có đúng bộ key của vi (ngôn ngữ chuẩn).
// Thêm namespace mới thì khai báo thêm ở cả hai type dưới đây.
import type viAi from './vi/ai'
import type viAlert from './vi/alert'
import type viAlertSetting from './vi/alertSetting'
import type viApiError from './vi/apiError'
import type viArea from './vi/area'
import type viBatcam from './vi/batcam'
import type viButtons from './vi/buttons'
import type viCamera from './vi/camera'
import type viCameraBrand from './vi/cameraBrand'
import type viCommon from './vi/common'
import type viDashboard from './vi/dashboard'
import type viEnums from './vi/enums'
import type viError from './vi/error'
import type viFields from './vi/fields'
import type viFormula from './vi/formula'
import type viLayout from './vi/layout'
import type viLive from './vi/live'
import type viLogin from './vi/login'
import type viMachine from './vi/machine'
import type viMachinePart from './vi/machinePart'
import type viMachineType from './vi/machineType'
import type viMap from './vi/map'
import type viPd from './vi/pd'
import type viRouter from './vi/router'
import type viSensor from './vi/sensor'
import type viUpload from './vi/upload'
import type viUser from './vi/user'
import type viValidation from './vi/validation'
import type viVideo from './vi/video'
import type enAi from './en/ai'
import type enAlert from './en/alert'
import type enAlertSetting from './en/alertSetting'
import type enApiError from './en/apiError'
import type enArea from './en/area'
import type enBatcam from './en/batcam'
import type enButtons from './en/buttons'
import type enCamera from './en/camera'
import type enCameraBrand from './en/cameraBrand'
import type enCommon from './en/common'
import type enDashboard from './en/dashboard'
import type enEnums from './en/enums'
import type enError from './en/error'
import type enFields from './en/fields'
import type enFormula from './en/formula'
import type enLayout from './en/layout'
import type enLive from './en/live'
import type enLogin from './en/login'
import type enMachine from './en/machine'
import type enMachinePart from './en/machinePart'
import type enMachineType from './en/machineType'
import type enMap from './en/map'
import type enPd from './en/pd'
import type enRouter from './en/router'
import type enSensor from './en/sensor'
import type enUpload from './en/upload'
import type enUser from './en/user'
import type enValidation from './en/validation'
import type enVideo from './en/video'

export interface MessageSchema {
  ai: typeof viAi
  alert: typeof viAlert
  alertSetting: typeof viAlertSetting
  apiError: typeof viApiError
  area: typeof viArea
  batcam: typeof viBatcam
  buttons: typeof viButtons
  camera: typeof viCamera
  cameraBrand: typeof viCameraBrand
  common: typeof viCommon
  dashboard: typeof viDashboard
  enums: typeof viEnums
  error: typeof viError
  fields: typeof viFields
  formula: typeof viFormula
  layout: typeof viLayout
  live: typeof viLive
  login: typeof viLogin
  machine: typeof viMachine
  machinePart: typeof viMachinePart
  machineType: typeof viMachineType
  map: typeof viMap
  pd: typeof viPd
  router: typeof viRouter
  sensor: typeof viSensor
  upload: typeof viUpload
  user: typeof viUser
  validation: typeof viValidation
  video: typeof viVideo
}

interface EnMessages {
  ai: typeof enAi
  alert: typeof enAlert
  alertSetting: typeof enAlertSetting
  apiError: typeof enApiError
  area: typeof enArea
  batcam: typeof enBatcam
  buttons: typeof enButtons
  camera: typeof enCamera
  cameraBrand: typeof enCameraBrand
  common: typeof enCommon
  dashboard: typeof enDashboard
  enums: typeof enEnums
  error: typeof enError
  fields: typeof enFields
  formula: typeof enFormula
  layout: typeof enLayout
  live: typeof enLive
  login: typeof enLogin
  machine: typeof enMachine
  machinePart: typeof enMachinePart
  machineType: typeof enMachineType
  map: typeof enMap
  pd: typeof enPd
  router: typeof enRouter
  sensor: typeof enSensor
  upload: typeof enUpload
  user: typeof enUser
  validation: typeof enValidation
  video: typeof enVideo
}

type MissingKeysCheck<T extends MessageSchema> = T
type ExtraKeysCheck<T extends EnMessages> = T

// Lỗi ở dòng dưới = en thiếu key / en thừa key so với vi
export type EnHasAllKeys = MissingKeysCheck<EnMessages>
export type EnHasNoExtraKeys = ExtraKeysCheck<MessageSchema>
