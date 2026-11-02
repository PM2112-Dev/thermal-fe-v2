<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, CaretTop, Close, Edit, Odometer, Setting, SwitchButton, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { getCameraDetailApi } from '@/api/camera'
import { prepareCameraStream } from '@/plugins/webRTC/cameraStream'

import useRequest from '@/hooks/web/useRequest'
import { useCameraPtz } from '@/hooks/web/useCameraPtz'
import { useFitViewportHeight } from '@/hooks/web/useFitViewportHeight'
import { PTZ_SPEED_DEFAULT_PERCENT, PTZ_SPEED_STEP_PERCENT, toPtzSpeed } from '@/constants/camera'
import { PolygonDrawer } from '@/utils/PolygonDrawer'
import { thermalDataByAreaApi } from '@/api/thermal-data'
import { getBatcamRoisApi } from '@/api/batcam-config'
import { CAMERA_PD_TYPE } from '@/constants'
import { useClock } from '@/hooks/web/useClock'

const { t } = useLang()

const props = defineProps({
  streamKey: {
    required: true,
  },
  startDraw: {
    type: Boolean,
    default: false
  },
  showBtnBack: {
    type: Boolean,
    default: true
  }
})

const { localTime } = useClock()

const rootRef = ref<HTMLElement>()
const stageRef = ref<HTMLElement>()
const videoRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Khung video luôn đúng tỷ lệ của luồng để canvas vẽ vùng đo và overlay ROI khớp toạ độ với hình
const videoAspect = ref(16 / 9)
const stageSize = ref({ width: 0, height: 0 })
const feedStyle = computed(() => {
  const { width, height } = stageSize.value
  if (!width || !height) return undefined
  const w = Math.min(width, height * videoAspect.value)
  return { width: `${Math.floor(w)}px`, height: `${Math.floor(w / videoAspect.value)}px` }
})
function readVideoSize() {
  const video = videoStream.video as HTMLVideoElement | undefined
  if (video?.videoWidth && video?.videoHeight) {
    videoAspect.value = video.videoWidth / video.videoHeight
    roiNaturalWidth.value = video.videoWidth
    roiNaturalHeight.value = video.videoHeight
  }
}

const videoLoading = ref(true)
const videoError = ref(false)
const videoStream = document.createElement('video-stream') as any
videoStream.addEventListener('stream-onopen', () => {
  videoLoading.value = false
  videoError.value = false
  if (props.startDraw) {
    startDrawing()
  }
  readVideoSize()
})
videoStream.addEventListener('stream-error', () => {
  videoLoading.value = false
  videoError.value = true
})

// ---- Overlay ROI của camera giám sát phóng điện (chỉ đọc) ----
interface RoiOverlayItem {
  roiIndex: number
  cx: number
  cy: number
  nw: number
  nh: number
  name: string | null
  machineComponentName: string | null
}
const rois = ref<RoiOverlayItem[]>([])
const roiNaturalWidth = ref(1920)
const roiNaturalHeight = ref(1080)
const roiLabel = (roi: RoiOverlayItem) => roi.name || roi.machineComponentName || `ROI ${roi.roiIndex + 1}`
function loadRois() {
  getBatcamRoisApi(Number(props.streamKey)).then((res) => {
    // Chỉ vẽ ROI đã bật và đã gán bộ phận (ROI chưa gán không có nhãn để hiển thị).
    rois.value = (res.data ?? []).filter((r: any) => r.enabled && r.machineComponentId)
  })
}
const isPlaying = ref(false)
const isDrawing = ref(false)
const cam = ref<any>({})
// Tên luồng go2rtc BE trả về; luồng AI có hậu tố "_ai". Chế độ ticket không biết tên luồng.
const streamName = ref<string>()

const isPtz = computed(() => {
  const v = String(cam.value.ptzTypeObject?.code ?? cam.value.ptzType ?? '').toLowerCase()
  // Chưa rõ loại thì vẫn cho điều khiển như trước
  return v === '' || v === 'ptz' || v === '1'
})
// Đã bật "Phát luồng đã vẽ khung AI" nhưng BE vẫn trả luồng gốc → báo để người dùng biết không phải lỗi giao diện
const aiStreamMissing = computed(() =>
  !!cam.value.aiStreamEnabled && !!streamName.value && !streamName.value.endsWith('_ai'))

const speedPercent = ref(PTZ_SPEED_DEFAULT_PERCENT)
const { startCommand, stopCommand, sendCommand } = useCameraPtz(() => Number(props.streamKey), () => toPtzSpeed(speedPercent.value))

const directions = [
  { command: 'UpLeft', row: 1, column: 1, rotation: -45 },
  { command: 'Up', row: 1, column: 2, rotation: 0 },
  { command: 'UpRight', row: 1, column: 3, rotation: 45 },
  { command: 'Left', row: 2, column: 1, rotation: -90 },
  { command: 'Right', row: 2, column: 3, rotation: 90 },
  { command: 'DownLeft', row: 3, column: 1, rotation: -135 },
  { command: 'Down', row: 3, column: 2, rotation: 180 },
  { command: 'DownRight', row: 3, column: 3, rotation: 135 },
] as const

// Khởi động lại / hiệu chuẩn: hỏi lại trước khi gửi để tránh bấm nhầm
const running = ref<'Restart' | 'Calibration' | null>(null)
async function confirmSend(key: 'Restart' | 'Calibration', messageKey: string) {
  try {
    await ElMessageBox.confirm(t(messageKey), t('common.confirm'), { type: 'warning' })
  } catch {
    return
  }
  running.value = key
  try {
    await sendCommand(key)
    ElMessage.success(t('video.ctlSent'))
  } finally {
    running.value = null
  }
}

let stageObserver: ResizeObserver | undefined
onMounted(() => {
  prepareCameraStream(videoStream, props.streamKey as string | number)
      .then((name) => {
        streamName.value = name
        videoRef?.value?.appendChild(videoStream)

        const video = videoStream.video
        video.addEventListener('loadedmetadata', readVideoSize)
        video.addEventListener('resize', readVideoSize)
        video.addEventListener('waiting', () => {
          isPlaying.value = false
        })
        video.addEventListener('playing', () => {
          isPlaying.value = true
        })
        video.addEventListener('pause', () => {
          isPlaying.value = false
        })
      })
      .catch(() => {
        videoLoading.value = false
        videoError.value = true
      })

  getCameraDetailApi(props.streamKey).then(res => {
    cam.value = res.data
    if (cam.value.cameraType === CAMERA_PD_TYPE) loadRois()
  })

  stageObserver = new ResizeObserver(([entry]) => {
    stageSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  if (stageRef.value) stageObserver.observe(stageRef.value)
})

const videoWidth = ref(0)
const videoHeight = ref(0)
let drawer: PolygonDrawer | null = null
const pointValues = ref<any>([])
const emits = defineEmits(['pointedClicked'])

function startDrawing(ranges = []) {
  isDrawing.value = true
  nextTick(() => {
    const c = canvasRef.value
    const v = videoRef.value?.querySelector('video') as HTMLVideoElement
    if (c && v) {
      // size canvas theo video thật
      c.width = v.clientWidth
      c.height = v.clientHeight

      videoWidth.value = v.clientWidth
      videoHeight.value = v.clientHeight
      if (!drawer) {
        drawer = new PolygonDrawer(
            c,
            (_points) => {
              isDrawing.value = false
            },
            (points) => {
              pointValues.value = points
              emits('pointedClicked', points)
              nextTick(() => {
                if (points.length >= 3 && !drawer?.isConvex()) {
                  drawer?.showFullScreenAlert(videoRef, t('video.notConvex'))
                  drawer?.clearLastPoint()
                }
              })
            },
        )
        if (ranges.length) {
          drawer.loadRanges(ranges)
        }
      }

      drawer.removeAllPoint() // always start fresh
      drawer.start()
    }
  })
}

const stopDrawing = () => {
  drawer?.removeAllPoint()
  isDrawing.value = false
  visibleMeasurement.value = false

  if (timerId.value) {
    clearInterval(timerId.value)
  }
}

const clearAllPoint = () => {
  drawer?.removeAllPoint()
}

const clearPoint = () => {
  drawer?.removePoint()
}

const timerId = ref(0)
onUnmounted(() => {
  if (timerId.value) {
    clearInterval(timerId.value)
  }
  stageObserver?.disconnect()
})

function measureTemp() {
  if (timerId.value) {
    clearInterval(timerId.value)
  }
  measureTempAction()
  timerId.value = setInterval(() => {
    measureTempAction()
  }, 10000)
}

const { onRequest: measureTempRequest, isLoading: measureTempLoading } = useRequest()
const visibleMeasurement = ref(false)
const measurementResult = ref()

function measureTempAction() {
  measureTempRequest(thermalDataByAreaApi, {
    videoWidth: videoWidth.value,
    videoHeight: videoHeight.value,
    cameraId: props.streamKey,
    points: pointValues.value,
  })
      .then((res) => {
        visibleMeasurement.value = true
        measurementResult.value = res.data
      })
      .catch((e) => {
        drawer?.showFullScreenAlert(videoRef, e.toString())
      })
}

const formatTemp = (v: unknown) => (v == null || Number.isNaN(Number(v)) ? '--' : `${Number(v).toFixed(1)}°C`)

const loadRanges = (ranges) => {
  if (drawer) {
    drawer.loadRanges(ranges)
  }
}

// Cả màn cao vừa khung nội dung: video co giãn, không phải cuộn trang
const { fitHeight, compact } = useFitViewportHeight(rootRef, 900)

defineExpose({
  startDrawing,
  clearAllPoint,
  clearPoint,
  videoRef,
  loadRanges
})
</script>
<template>
  <div
    ref="rootRef"
    class="live"
    :class="{ 'live--fit': fitHeight && !compact }"
    :style="fitHeight && !compact ? { height: `${fitHeight}px` } : undefined"
  >
    <header class="live__header">
      <div class="live__title-group">
        <router-link v-show="showBtnBack" class="live__back" :title="t('video.back')" to="/live">
          <el-icon><ArrowLeft/></el-icon>
        </router-link>
        <div class="live__title">
          <div class="live__code">{{ cam?.name || cam?.code }}</div>
          <div class="live__area">
            <span v-if="cam?.name && cam?.code">{{ cam.code }}</span>
            <span v-if="cam?.area?.name">{{ cam.area.name }}</span>
          </div>
        </div>
      </div>
      <div class="live__meta">
        <el-tooltip v-if="aiStreamMissing" :content="t('video.aiStreamMissingHint')" placement="bottom">
          <span class="live__chip live__chip--warn">{{ t('video.aiStreamMissing') }}</span>
        </el-tooltip>
        <span v-else-if="cam?.aiStreamEnabled" class="live__chip live__chip--ai">{{ t('video.aiStreamOn') }}</span>
        <span class="live__chip live__chip--live">LIVE</span>
        <span class="live__clock">{{ localTime }}</span>
      </div>
    </header>

    <div class="live__body">
      <!-- Vùng video: nền đen, hình giữ đúng tỷ lệ -->
      <section ref="stageRef" class="live__stage">
        <div class="live__feed" :style="feedStyle">
          <div ref="videoRef" class="live__video"></div>
          <canvas ref="canvasRef" class="live__canvas" :class="{ 'is-drawing': isDrawing }"></canvas>
          <!-- Overlay ROI giám sát phóng điện (chỉ đọc) - xem CameraBatcamConfigPanel.vue (nơi vẽ/lưu ROI). -->
          <svg
              v-if="rois.length"
              class="live__roi"
              :viewBox="`0 0 ${roiNaturalWidth} ${roiNaturalHeight}`"
              preserveAspectRatio="xMidYMid meet"
          >
            <rect
                v-for="roi in rois"
                :key="roi.roiIndex"
                :x="(roi.cx - roi.nw / 2) * roiNaturalWidth"
                :y="(roi.cy - roi.nh / 2) * roiNaturalHeight"
                :width="roi.nw * roiNaturalWidth"
                :height="roi.nh * roiNaturalHeight"
                class="roi-shape"
                :class="`roi-shape--${roi.roiIndex % 3}`"
            />
            <text
                v-for="roi in rois"
                :key="`roi-label-${roi.roiIndex}`"
                :x="roi.cx * roiNaturalWidth"
                :y="(roi.cy - roi.nh / 2) * roiNaturalHeight - 6"
                class="roi-label"
            >{{ roiLabel(roi) }}</text>
          </svg>
        </div>
        <div v-if="videoLoading" v-loading="true" class="live__state" element-loading-background="transparent"></div>
        <div v-else-if="videoError" class="live__state live__state--error">{{ t('video.streamError') }}</div>
        <div v-if="isDrawing" class="live__draw-hint">{{ t('video.drawHint') }}</div>
      </section>

      <aside class="live__panel">
        <!-- Điều khiển PTZ -->
        <div v-if="isPtz" class="live__card">
          <div class="live__card-head">
            <span class="live__card-title">{{ t('video.ctlDirection') }}</span>
            <el-tooltip :content="t('video.ctlHoldHint')" placement="left">
              <span class="live__help">?</span>
            </el-tooltip>
          </div>
          <div class="live__dpad" role="group" :aria-label="t('video.ctlDirection')">
            <button
                v-for="d in directions"
                :key="d.command"
                type="button"
                class="live__dir"
                :class="{ 'is-diagonal': d.rotation % 90 !== 0 }"
                :aria-label="d.command"
                :style="{ gridRow: d.row, gridColumn: d.column, '--rot': `${d.rotation}deg` }"
                @pointerdown.prevent="startCommand(d.command)"
                @pointerup="stopCommand"
                @pointerleave="stopCommand"
                @pointercancel="stopCommand"
            >
              <el-icon><CaretTop/></el-icon>
            </button>
            <span class="live__dpad-center">PTZ</span>
          </div>

          <div class="live__field">
            <div class="live__card-head">
              <span class="live__label">{{ t('video.rotationSpeed') }}</span>
              <span class="live__value">{{ speedPercent }}%</span>
            </div>
            <el-slider
                v-model="speedPercent"
                :min="0"
                :max="100"
                :step="PTZ_SPEED_STEP_PERCENT"
                :format-tooltip="(v: number) => `${v}%`"
            />
          </div>

        </div>

        <!-- Thu phóng: hiện cho mọi loại camera (camera cố định vẫn có thể có zoom quang) -->
        <div class="live__card">
          <span class="live__card-title">{{ t('video.ctlZoom') }}</span>
          <div class="live__row">
            <el-button
                :icon="ZoomIn"
                @pointerdown.prevent="startCommand('ZoomIn')"
                @pointerup="stopCommand"
                @pointerleave="stopCommand"
                @pointercancel="stopCommand"
            >{{ t('video.zoomIn') }}</el-button>
            <el-button
                :icon="ZoomOut"
                @pointerdown.prevent="startCommand('ZoomOut')"
                @pointerup="stopCommand"
                @pointerleave="stopCommand"
                @pointercancel="stopCommand"
            >{{ t('video.zoomOut') }}</el-button>
          </div>
        </div>

        <slot name="sidebar">
          <!-- Đo nhiệt độ theo vùng vẽ trên hình -->
          <div class="live__card">
            <span class="live__card-title">{{ t('video.measureTitle') }}</span>
            <el-button v-if="!isDrawing" class="live__full" type="primary" plain :icon="Edit" @click="() => startDrawing()">
              {{ t('video.drawPointArea') }}
            </el-button>
            <div v-else class="live__row">
              <el-button type="primary" :icon="Odometer" :loading="measureTempLoading" @click="measureTemp">
                {{ t('video.measure') }}
              </el-button>
              <el-button type="danger" plain :icon="Close" @click="stopDrawing">{{ t('video.exit') }}</el-button>
            </div>

            <div v-show="visibleMeasurement" class="live__temps">
              <div class="live__temp live__temp--max">
                <span>Max</span>
                <strong>{{ formatTemp(measurementResult?.maxTemperature) }}</strong>
              </div>
              <div class="live__temp live__temp--avg">
                <span>Avg</span>
                <strong>{{ formatTemp(measurementResult?.aveTemperature) }}</strong>
              </div>
              <div class="live__temp live__temp--min">
                <span>Min</span>
                <strong>{{ formatTemp(measurementResult?.minTemperature) }}</strong>
              </div>
            </div>
          </div>

          <!-- Thiết bị -->
          <div class="live__card">
            <span class="live__card-title">{{ t('video.ctlDevice') }}</span>
            <div class="live__row">
              <el-button type="warning" plain :icon="SwitchButton" :loading="running === 'Restart'" @click="confirmSend('Restart', 'video.ctlRestartConfirm')">
                {{ t('video.restart') }}
              </el-button>
              <el-button v-if="isPtz" plain :icon="Setting" :loading="running === 'Calibration'" @click="confirmSend('Calibration', 'video.ctlCalibrationConfirm')">
                {{ t('video.ctlCalibration') }}
              </el-button>
            </div>
            <router-link v-if="cam?.id" class="live__link" :to="{ name: 'camera_setting', params: { id: cam.id } }">
              <el-icon><Setting/></el-icon>{{ t('video.cameraSettings') }}
            </router-link>
          </div>
        </slot>
      </aside>
    </div>
  </div>
</template>
<style scoped>
.live {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}

/* HEADER */
.live__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}
.live__title-group { display: flex; align-items: center; gap: 12px; min-width: 0; }
.live__back {
  display: grid;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-sub);
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s;
}
.live__back:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.live__title { min-width: 0; }
.live__code { overflow: hidden; font-size: 15px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.live__area { display: flex; gap: 8px; color: var(--text-sub); font-size: 12px; }
.live__area span + span::before { margin-right: 8px; content: '·'; }
.live__meta { display: flex; flex-shrink: 0; align-items: center; gap: 10px; }
.live__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.live__chip--live { background: rgb(239 68 68 / 15%); color: #ef4444; }
.live__chip--live::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: live-blink 1.6s infinite;
  content: '';
}
.live__chip--ai { background: rgb(16 185 129 / 15%); color: #10b981; }
.live__chip--warn { background: rgb(245 158 11 / 15%); color: #f59e0b; cursor: help; }
.live__clock { color: var(--text-sub); font-family: 'JetBrains Mono', monospace; font-size: 13px; font-variant-numeric: tabular-nums; }
@keyframes live-blink { 50% { opacity: 0.3; } }

/* BODY: video | bảng điều khiển */
.live__body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 320px;
  min-height: 0;
}

.live__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  background: #000;
}
/* Khung hẹp (xếp dọc): video theo tỷ lệ 16:9 của chiều rộng */
.live:not(.live--fit) .live__stage { aspect-ratio: 16 / 9; }
.live__feed { position: relative; width: 100%; height: 100%; }
.live__video,
.live__video :deep(video-stream) { display: block; width: 100%; height: 100%; }
.live__video :deep(video) { display: block; width: 100% !important; height: 100% !important; object-fit: contain; }
.live__canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
.live__canvas.is-drawing { cursor: crosshair; pointer-events: auto; }
.live__state { position: absolute; inset: 0; display: grid; place-items: center; }
.live__state--error { color: #94a3b8; font-size: 13px; }
.live__draw-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgb(15 23 42 / 80%);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
  transform: translateX(-50%);
}

/* Overlay ROI - màu cố định (không theo theme trang), đè lên video giống mọi overlay video khác. */
.live__roi { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; pointer-events: none; }
.roi-shape { fill: rgb(64 158 255 / 15%); stroke: #409eff; stroke-width: 3; }
.roi-shape--1 { fill: rgb(103 194 58 / 15%); stroke: #67c23a; }
.roi-shape--2 { fill: rgb(230 162 60 / 15%); stroke: #e6a23c; }
.roi-label { fill: #fff; font-size: 20px; text-anchor: middle; paint-order: stroke; stroke: #000; stroke-width: 4px; }

/* PANEL */
.live__panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
  border-left: 1px solid var(--border);
}
.live__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}
.live__card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.live__card-title {
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.live__help {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text-sub);
  font-size: 11px;
  cursor: help;
}
.live__field { display: flex; flex-direction: column; gap: 4px; }
.live__label { color: var(--text-sub); font-size: 12px; font-weight: 600; }
.live__value { color: var(--el-color-primary); font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.live__field :deep(.el-slider) { height: 28px; padding: 0 8px; }
.live__row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 8px; }
.live__row :deep(.el-button),
.live__full { width: 100%; margin: 0; }
.live__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--el-color-primary);
  font-size: 13px;
  text-decoration: none;
}
.live__link:hover { text-decoration: underline; }

/* D-pad tròn */
.live__dpad {
  display: grid;
  width: 156px;
  height: 156px;
  margin: 2px auto 4px;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  place-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, var(--el-fill-color-light), var(--el-fill-color-darker));
  touch-action: none;
  user-select: none;
}
.live__dir {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  touch-action: none;
  transition: background-color 0.15s, transform 0.1s;
}
.live__dir .el-icon { font-size: 24px; transform: rotate(var(--rot)); }
.live__dir.is-diagonal .el-icon { font-size: 17px; }
.live__dir:hover { background: var(--el-color-primary-light-8); }
.live__dir:active { background: var(--el-color-primary); color: #fff; transform: scale(0.94); }
.live__dir:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.live__dpad-center {
  display: grid;
  width: 52px;
  height: 52px;
  grid-area: 2 / 2;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #5ba9e0, #1d5da8);
  box-shadow: 0 2px 6px rgb(0 0 0 / 35%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

/* Kết quả đo */
.live__temps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.live__temp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border: 1px solid currentColor;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
.live__temp strong { font-family: 'JetBrains Mono', monospace; font-size: 14px; }
.live__temp--max { background: rgb(239 68 68 / 10%); color: #ef4444; }
.live__temp--avg { background: rgb(245 158 11 / 10%); color: #f59e0b; }
.live__temp--min { background: rgb(16 185 129 / 10%); color: #10b981; }

/* Khung hẹp: video trên, bảng điều khiển dưới, cuộn trang bình thường */
.live:not(.live--fit) .live__body { grid-template-columns: minmax(0, 1fr); }
.live:not(.live--fit) .live__panel { border-top: 1px solid var(--border); border-left: 0; overflow: visible; }
@media (max-width: 640px) {
  .live__clock { display: none; }
}
</style>
