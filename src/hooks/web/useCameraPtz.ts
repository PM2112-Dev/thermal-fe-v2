import { onMounted, onUnmounted, watch } from 'vue'
import { sendCommandCameraApi } from '@/api/camera'
import { CAMERA_COMMANDS } from '@/constants/camera'

/** Giữ đúng thứ tự start/stop, kể cả khi người dùng nhả nút trước khi lệnh start trả về. */
export function useCameraPtz(cameraId: () => number, speed: () => number) {
  let queue: Promise<unknown> = Promise.resolve()
  let active: { cameraId: number; command: number } | undefined
  let previous = CAMERA_COMMANDS.Stop as number
  function send(id: number, command: number, preCommand: number) {
    const payload = { cameraId: id, command, preCommand, speed: speed() }
    // Axios tự hiện lỗi; bắt ở đây để lệnh start lỗi không chặn lệnh stop
    queue = queue.then(() => sendCommandCameraApi(payload)).catch(() => undefined)
  }
  function stopCommand() {
    if (!active) return
    const last = active
    active = undefined
    send(last.cameraId, CAMERA_COMMANDS.Stop, last.command)
    previous = CAMERA_COMMANDS.Stop
  }
  function startCommand(key: keyof typeof CAMERA_COMMANDS) {
    const command = CAMERA_COMMANDS[key]
    if (active?.cameraId === cameraId() && active.command === command) return
    stopCommand()
    active = { cameraId: cameraId(), command }
    send(active.cameraId, command, previous)
    previous = command
  }
  /** Lệnh gửi một lần (khởi động lại, hiệu chuẩn): dừng chuyển động đang chạy rồi gửi, trả về khi BE xử lý xong. */
  function sendCommand(key: keyof typeof CAMERA_COMMANDS) {
    stopCommand()
    const command = CAMERA_COMMANDS[key]
    const payload = { cameraId: cameraId(), command, preCommand: previous, speed: speed() }
    previous = command
    const result = queue.then(() => sendCommandCameraApi(payload))
    queue = result.catch(() => undefined)
    return result
  }
  const onVisibility = () => { if (document.hidden) stopCommand() }
  watch(cameraId, stopCommand)
  onMounted(() => {
    window.addEventListener('blur', stopCommand)
    document.addEventListener('visibilitychange', onVisibility)
  })
  onUnmounted(() => {
    stopCommand()
    window.removeEventListener('blur', stopCommand)
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return { startCommand, stopCommand, sendCommand }
}
