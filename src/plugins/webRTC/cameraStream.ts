import { getStreamApi, getStreamTicketApi } from '@/api/camera'

/** Trả về tên luồng go2rtc BE cấp (chế độ ticket không biết tên luồng nên trả undefined). */
export const prepareCameraStream = async (player: any, cameraId: string | number): Promise<string | undefined> => {
  const url = new URL(import.meta.env.VITE_LIVE_PATH, window.location.href)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol === 'http:') url.protocol = 'ws:'

  if (url.pathname.toLowerCase() === '/api/camerastreams/ws') {
    // These modes carry media through the authenticated socket without a public WebRTC port.
    player.mode = 'mse,mp4,mjpeg'
    player.getWebSocketUrl = async () => {
      const res = await getStreamTicketApi(cameraId)
      if (typeof res.data !== 'string' || res.data.length !== 64) {
        throw new Error('Invalid camera stream ticket')
      }
      const connectionUrl = new URL(url)
      connectionUrl.search = ''
      connectionUrl.searchParams.set('ticket', res.data)
      return connectionUrl.toString()
    }
  } else {
    const res = await getStreamApi(cameraId)
    url.searchParams.set('src', res.data)
    player.getWebSocketUrl = null
    player.src = url
    return typeof res.data === 'string' ? res.data : undefined
  }

  player.src = url
  return undefined
}
