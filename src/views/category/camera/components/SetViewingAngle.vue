<template>
  <div
    ref="rootRef"
    class="cam-ctl"
    :class="{ 'cam-ctl--fit': isEditing && fitHeight && !compact }"
    :style="isEditing && fitHeight && !compact ? { height: `${fitHeight}px` } : undefined"
  >
    <!-- Video trực tiếp: chiếm phần còn lại sau hàng nút -->
    <section v-if="isEditing" class="cam-ctl__video">
      <WebRTCPlayer :stream-key="formModel.id" :cam="formModel" class="cam-ctl__player"/>
    </section>

    <!-- Hàng điều khiển gọn bên dưới -->
    <aside class="cam-ctl__panel">
      <div class="cam-ctl__card cam-ctl__card--dpad">
        <template v-if="isPtz">
          <div class="cam-ctl__dpad" role="group" :aria-label="t('video.ctlDirection')" :title="t('video.ctlHoldHint')">
            <button
              v-for="d in directions"
              :key="d.command"
              type="button"
              class="cam-ctl__dir"
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
            <span class="cam-ctl__dpad-center">PTZ</span>
          </div>
        </template>
        <p v-else class="cam-ctl__hint">{{ t('video.ctlNotPtz') }}</p>
      </div>

      <div class="cam-ctl__card cam-ctl__card--middle">
        <template v-if="isPtz">
          <div class="cam-ctl__card-head">
            <span class="cam-ctl__card-title">{{ t('video.rotationSpeed') }}</span>
            <span class="cam-ctl__speed-value">{{ speedPercent }}%</span>
          </div>
          <el-slider
            v-model="speedPercent"
            :min="0"
            :max="100"
            :step="PTZ_SPEED_STEP_PERCENT"
            :format-tooltip="(v: number) => `${v}%`"
          />
        </template>
        <div class="cam-ctl__card-title cam-ctl__card-title--spaced">{{ t('video.ctlZoom') }}</div>
        <div class="cam-ctl__row">
          <el-button
            class="cam-ctl__grow"
            :icon="ZoomIn"
            @pointerdown.prevent="startCommand('ZoomIn')"
            @pointerup="stopCommand"
            @pointerleave="stopCommand"
            @pointercancel="stopCommand"
          >{{ t('video.zoomIn') }}</el-button>
          <el-button
            class="cam-ctl__grow"
            :icon="ZoomOut"
            @pointerdown.prevent="startCommand('ZoomOut')"
            @pointerup="stopCommand"
            @pointerleave="stopCommand"
            @pointercancel="stopCommand"
          >{{ t('video.zoomOut') }}</el-button>
        </div>
      </div>

      <div class="cam-ctl__card cam-ctl__card--device">
        <div class="cam-ctl__card-title">{{ t('video.ctlDevice') }}</div>
        <div class="cam-ctl__col">
          <el-button class="cam-ctl__grow" type="warning" plain :icon="SwitchButton" :loading="running === 'Restart'" @click="confirmSend('Restart', 'video.ctlRestartConfirm')">
            {{ t('video.restart') }}
          </el-button>
          <el-button class="cam-ctl__grow" type="primary" plain :icon="Setting" :loading="running === 'Calibration'" @click="confirmSend('Calibration', 'video.ctlCalibrationConfirm')">
            {{ t('video.ctlCalibration') }}
          </el-button>
        </div>
      </div>

      <slot></slot>
    </aside>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CaretTop, Setting, SwitchButton, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import { useCameraPtz } from '@/hooks/web/useCameraPtz'
import { useFitViewportHeight } from '@/hooks/web/useFitViewportHeight'
import { PTZ_SPEED_DEFAULT_PERCENT, PTZ_SPEED_STEP_PERCENT, toPtzSpeed } from '@/constants/camera'
import WebRTCPlayer from '@/components/Video/WebRTCPlayer.vue'

const props = defineProps({
  formModel: {
    type: Object,
    required: true,
  },
  isEditing: {
    type: Boolean,
    required: false,
  }
})

const { t } = useLang()

const isPtz = computed(() => {
  const v = String(props.formModel.ptzTypeObject?.code ?? props.formModel.ptzType ?? '').toLowerCase()
  // Chưa rõ loại thì vẫn cho điều khiển như trước
  return v === '' || v === 'ptz' || v === '1'
})

const speedPercent = ref(PTZ_SPEED_DEFAULT_PERCENT)
const { startCommand, stopCommand, sendCommand } = useCameraPtz(() => Number(props.formModel.id), () => toPtzSpeed(speedPercent.value))

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

// Cả tab cao vừa phần màn hình còn lại; video co lại để hàng nút luôn nằm trong màn hình
const rootRef = ref<HTMLElement>()
const { fitHeight, compact } = useFitViewportHeight(rootRef, 640)
</script>

<style scoped>
/* Camera ở trên, hàng nút gọn bên dưới */
.cam-ctl {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Video: mặc định 16:9 theo chiều rộng (lệch tỷ lệ thì có viền đen) */
.cam-ctl__video {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #0f1424;
}
/* Chế độ vừa màn hình: cả tab cao đúng phần còn lại, video lấy hết chỗ trống sau hàng nút → không phải cuộn */
.cam-ctl--fit .cam-ctl__video {
  flex: 1 1 0;
  min-height: 200px;
  aspect-ratio: auto;
}
.cam-ctl--fit .cam-ctl__panel { flex: none; }
.cam-ctl__player {
  width: 100%;
  height: 100%;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.cam-ctl__player :deep(.flex-wrap.m-0) { display: none; }
.cam-ctl__player :deep(.aspect-video) { height: 100%; aspect-ratio: auto; border: 0; border-radius: 0; }
.cam-ctl__player :deep(.aspect-video > div) { height: 100%; }
.cam-ctl__player :deep(video-stream) { display: block; width: 100%; height: 100%; }
.cam-ctl__player :deep(video) { width: 100% !important; height: 100% !important; object-fit: contain !important; }

/* Hàng nút: tốc độ + thu phóng | D-pad (giữa, to nhất) | thiết bị */
.cam-ctl__panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
}
.cam-ctl__card--middle { order: 1; justify-content: center; }
.cam-ctl__card--dpad { order: 2; align-items: center; justify-content: center; padding: 8px 20px; }
.cam-ctl__card--device { order: 3; }
.cam-ctl__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-bg-color);
}
.cam-ctl__card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.cam-ctl__card-title {
  display: block;
  margin-bottom: 6px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.cam-ctl__card-head .cam-ctl__card-title { margin-bottom: 0; }
.cam-ctl__card-title--spaced { margin-top: 6px; }
.cam-ctl__speed-value { color: var(--el-color-primary); font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.cam-ctl__speed-value small { margin-left: 4px; color: var(--el-text-color-secondary); font-size: 11px; font-weight: 500; }
.cam-ctl__card :deep(.el-slider) { height: 28px; padding: 0 6px; }
.cam-ctl__hint { margin: 6px 0 0; color: var(--el-text-color-secondary); font-size: 12px; text-align: center; }
.cam-ctl__row { display: flex; gap: 8px; }
.cam-ctl__col { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: 8px; }
.cam-ctl__row :deep(.el-button),
.cam-ctl__col :deep(.el-button) { width: 100%; margin: 0; }
.cam-ctl__grow { flex: 1; min-width: 0; }

/* D-pad tròn, nút chính nên to nhất */
.cam-ctl__dpad {
  display: grid;
  width: 150px;
  height: 150px;
  margin: 0 auto;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  place-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, var(--el-fill-color-light), var(--el-fill-color-darker));
  touch-action: none;
  user-select: none;
}
.cam-ctl__dir {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  touch-action: none;
  transition: background-color 0.15s, transform 0.1s;
}
.cam-ctl__dir .el-icon { font-size: 24px; transform: rotate(var(--rot)); }
.cam-ctl__dir.is-diagonal .el-icon { font-size: 17px; }
.cam-ctl__dir:hover { background: var(--el-color-primary-light-8); }
.cam-ctl__dir:active { background: var(--el-color-primary); color: #fff; transform: scale(0.94); }
.cam-ctl__dir:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.cam-ctl__dpad-center {
  display: grid;
  width: 50px;
  height: 50px;
  grid-area: 2 / 2;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #5ba9e0, #1d5da8);
  box-shadow: 0 2px 6px rgb(0 0 0 / 35%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

/* Khung hẹp: các thẻ xếp dọc, cuộn trang bình thường */
@media (max-width: 640px) {
  .cam-ctl__panel { grid-template-columns: minmax(0, 1fr); }
  .cam-ctl__card--dpad { order: 0; }
  .cam-ctl__col { flex-direction: row; }
}
</style>
