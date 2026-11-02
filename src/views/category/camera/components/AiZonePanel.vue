<template>
  <div class="zone-panel">
    <div class="zone-card ai-stream-row">
      <div>
        <div class="card-title">{{ t('camera.aiStream') }}</div>
        <div class="card-sub">{{ t('camera.aiStreamHint') }}</div>
      </div>
      <el-switch v-model="aiStreamEnabled" :loading="savingAiStream" :disabled="!cameraDetail" @change="saveAiStream" />
    </div>

    <div class="zone-card">
      <div class="position-head">
        <div class="card-title">{{ t('ai.zonePosition') }}</div>
        <div class="card-sub">{{ t('ai.zonePositionHint') }}</div>
      </div>
      <div class="position-chips">
        <button class="chip" :class="{ active: currentPresetId === null }" :disabled="drawing" @click="selectPosition(null)">
          {{ t('ai.zoneAllPositions') }}
        </button>
        <button
          v-for="p in presets"
          :key="p.id"
          class="chip"
          :class="{ active: currentPresetId === p.id }"
          :disabled="drawing || invokingPresetId !== null"
          @click="selectPosition(p.id)"
        >
          <el-icon v-if="invokingPresetId === p.id" class="is-loading"><Loading /></el-icon>
          {{ p.name || `#${p.presetId}` }}
          <span class="chip-count" v-if="zoneCountOf(p.id)">{{ zoneCountOf(p.id) }}</span>
        </button>
      </div>
    </div>

    <div class="zone-layout">
      <div class="zone-stage" v-loading="streamLoading">
        <div ref="videoRef" class="zone-video"></div>
        <canvas
          ref="canvasRef"
          class="zone-canvas"
          :class="{ 'is-drawing': drawing }"
          @click="onCanvasClick"
          @dblclick.prevent="finishDrawing"
          @contextmenu.prevent="undoPoint"
        ></canvas>
        <div class="stage-legend">
          <span v-for="k in kinds" :key="k"><i :style="{ background: color(k) }"></i>{{ t(`ai.zoneKinds.${k}`) }}</span>
        </div>
        <div v-if="drawing" class="stage-tip">
          {{ form.kind === 'line' ? t('ai.zoneTipLine') : t('ai.zoneTipPolygon') }}
        </div>
      </div>

      <div class="zone-side">
        <div class="zone-card zone-form">
          <div class="form-head">
            <div class="card-title">{{ form.id ? t('ai.zoneEditTitle') : t('ai.zoneCreateTitle') }}</div>
            <el-button v-if="form.id" link type="primary" @click="resetForm">+ {{ t('ai.zoneNew') }}</el-button>
          </div>
          <el-input v-model="form.name" :placeholder="t('ai.zoneName')" />
          <div class="field">
            <div class="field-label">{{ t('ai.zoneType') }}</div>
            <div class="kind-options">
              <button
                v-for="k in kinds"
                :key="k"
                class="kind-option"
                :class="{ active: form.kind === k }"
                :disabled="drawing"
                @click="changeKind(k)"
              >
                <i :style="{ background: color(k) }"></i>{{ t(`ai.zoneKinds.${k}`) }}
              </button>
            </div>
          </div>
          <div class="field">
            <div class="field-label">{{ t('ai.zoneApplyTo') }}</div>
            <div class="apply-to">{{ presetLabel(form.presetId) }}</div>
          </div>
          <div class="zone-actions">
            <template v-if="drawing">
              <el-button type="success" :disabled="!canFinish" @click="finishDrawing">{{ t('ai.zoneFinish') }}</el-button>
              <el-button @click="undoPoint">{{ t('ai.zoneUndo') }}</el-button>
              <el-button @click="cancelDrawing">{{ t('common.cancel') }}</el-button>
            </template>
            <template v-else>
              <el-button type="primary" plain @click="startDrawing">
                {{ form.points.length ? t('ai.zoneRedraw') : t('ai.zoneDraw') }}
              </el-button>
              <el-button type="primary" :disabled="!canSave" :loading="saving" @click="save">
                {{ form.id ? t('common.update') : t('common.addNew') }}
              </el-button>
            </template>
          </div>
        </div>

        <div class="zone-card zone-list">
          <div class="form-head">
            <div class="card-title">{{ t('ai.zoneList') }}</div>
            <span class="list-count">{{ visibleZones.length }}</span>
          </div>
          <el-empty v-if="!visibleZones.length" :description="t('ai.zoneEmpty')" :image-size="50" />
          <div
            v-for="z in visibleZones"
            :key="z.id"
            class="zone-item"
            :class="{ active: z.id === form.id }"
            @click="edit(z)"
          >
            <span class="zone-dot" :style="{ background: color(z.kind) }"></span>
            <div class="zone-item-body">
              <div class="zone-item-name">{{ z.name }}</div>
              <div class="zone-item-sub">{{ t(`ai.zoneKinds.${z.kind}`) }} · {{ presetLabel(z.presetId) }}</div>
            </div>
            <el-button link type="danger" @click.stop="remove(z)">{{ t('ai.zoneDelete') }}</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import { prepareCameraStream } from '@/plugins/webRTC/cameraStream'
import { editCameraApi, getCameraDetailApi, invokePresetApi, listPresetsApi } from '@/api/camera'
import { addAiZoneApi, deleteAiZoneApi, editAiZoneApi, getAiZonesApi } from '@/api/ai'

const { t } = useLang()
const props = defineProps<{ camera: { id: number } }>()

const kinds = ['polygon', 'line', 'exclude']
const COLORS: Record<string, string> = { polygon: '#22c55e', line: '#f59e0b', exclude: '#ef4444' }
const color = (k: string) => COLORS[k] ?? '#3b82f6'

const videoRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const streamLoading = ref(true)
const videoStream = document.createElement('video-stream') as any

const zones = ref<any[]>([])
const presets = ref<any[]>([])
const saving = ref(false)
const drawing = ref(false)

// Vị trí đang xem (id bản ghi preset); null = mọi vị trí, không điều khiển camera
const currentPresetId = ref<number | null>(null)
const invokingPresetId = ref<number | null>(null)

const emptyForm = () => ({ id: 0, name: '', kind: 'polygon', presetId: currentPresetId.value, points: [] as number[][] })
const form = reactive(emptyForm())

// Bật luồng AI lưu qua PUT camera nên phải gửi lại cả CameraDto đầy đủ
const cameraDetail = ref<Record<string, any> | null>(null)
const aiStreamEnabled = ref(false)
const savingAiStream = ref(false)
const loadCameraDetail = async () => {
  cameraDetail.value = (await getCameraDetailApi(props.camera.id)).data as any
  aiStreamEnabled.value = !!cameraDetail.value?.aiStreamEnabled
}
const saveAiStream = async (val: string | number | boolean) => {
  if (!cameraDetail.value) return
  savingAiStream.value = true
  try {
    await editCameraApi(props.camera.id, { ...cameraDetail.value, aiStreamEnabled: !!val })
    cameraDetail.value.aiStreamEnabled = !!val
    ElMessage.success(t('common.saveSuccess'))
  } catch {
    aiStreamEnabled.value = !val
  } finally {
    savingAiStream.value = false
  }
}

const minPoints = computed(() => (form.kind === 'line' ? 2 : 3))
const canFinish = computed(() => form.points.length >= minPoints.value)
const canSave = computed(() => !!form.name.trim() && form.points.length >= minPoints.value && !drawing.value)
const presetLabel = (id?: number | null) =>
  id ? presets.value.find((p) => p.id === id)?.name || `#${id}` : t('ai.zoneAllPositions')
const zoneCountOf = (presetId: number) => zones.value.filter((z) => z.presetId === presetId).length

// Ở một vị trí: hiện vùng của vị trí đó và vùng áp dụng mọi vị trí
const visibleZones = computed(() =>
  currentPresetId.value === null
    ? zones.value
    : zones.value.filter((z) => !z.presetId || z.presetId === currentPresetId.value),
)

const loadZones = async () => {
  zones.value = (await getAiZonesApi(props.camera.id)).data ?? []
  redraw()
}

async function gotoPreset(presetId: number | null) {
  currentPresetId.value = presetId
  if (presetId === null) return
  invokingPresetId.value = presetId
  try {
    // API nhận id bản ghi trong DB rồi tự gọi số preset trên camera
    await invokePresetApi({ cameraId: props.camera.id, presetId })
    ElMessage.success(t('camera.ptmGotoDone'))
  } finally {
    invokingPresetId.value = null
  }
}

async function selectPosition(presetId: number | null) {
  if (presetId === currentPresetId.value) return
  resetForm()
  form.presetId = presetId
  redraw()
  await gotoPreset(presetId)
}

onMounted(async () => {
  loadCameraDetail()
  videoStream.addEventListener('stream-onopen', () => {
    streamLoading.value = false
    nextTick(fitCanvas)
  })
  videoStream.addEventListener('stream-error', () => (streamLoading.value = false))
  try {
    await prepareCameraStream(videoStream, props.camera.id)
    videoRef.value?.appendChild(videoStream)
  } catch {
    streamLoading.value = false
  }
  window.addEventListener('resize', fitCanvas)
  try {
    presets.value = ((await listPresetsApi(props.camera.id)).data as any)?.presets ?? []
  } catch {
    presets.value = []
  }
  await loadZones()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitCanvas)
  videoStream.src = ''
  videoStream.remove()
})

// Canvas phủ đúng lên khung video; toạ độ lưu chuẩn hoá 0-1 nên không phụ thuộc kích thước hiển thị.
function fitCanvas() {
  const c = canvasRef.value
  const box = videoRef.value
  if (!c || !box) return
  c.width = box.clientWidth
  c.height = box.clientHeight
  redraw()
}

function drawShape(ctx: CanvasRenderingContext2D, pts: number[][], kind: string, strokeColor: string, closed: boolean, fill: boolean) {
  const { width: w, height: h } = ctx.canvas
  if (!pts.length) return
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)))
  if (closed && kind !== 'line' && pts.length >= 3) ctx.closePath()
  ctx.lineWidth = 2
  ctx.strokeStyle = strokeColor
  if (fill && closed && kind !== 'line' && pts.length >= 3) {
    ctx.fillStyle = strokeColor + '33'
    ctx.fill()
  }
  ctx.stroke()
  ctx.fillStyle = strokeColor
  pts.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x * w, y * h, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function redraw() {
  const c = canvasRef.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  ctx.clearRect(0, 0, c.width, c.height)
  visibleZones.value
    .filter((z) => z.id !== form.id)
    .forEach((z) => drawShape(ctx, z.points ?? [], z.kind, color(z.kind), true, true))
  drawShape(ctx, form.points, form.kind, color(form.kind), !drawing.value, true)
}

function startDrawing() {
  form.points = []
  drawing.value = true
  redraw()
}

function changeKind(k: string) {
  if (form.kind === k) return
  form.kind = k
  form.points = []
  redraw()
}

function onCanvasClick(e: MouseEvent) {
  if (!drawing.value) return
  const c = canvasRef.value!
  const r = c.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  // dblclick cũng bắn 2 click; bỏ điểm trùng liền kề
  const last = form.points[form.points.length - 1]
  if (last && Math.abs(last[0] - x) < 0.005 && Math.abs(last[1] - y) < 0.005) return
  form.points.push([+x.toFixed(4), +y.toFixed(4)])
  redraw()
  if (form.kind === 'line' && form.points.length === 2) finishDrawing()
}

function undoPoint() {
  if (!drawing.value) return
  form.points.pop()
  redraw()
}

function finishDrawing() {
  if (!canFinish.value) return
  drawing.value = false
  redraw()
}

function cancelDrawing() {
  drawing.value = false
  const z = zones.value.find((x) => x.id === form.id)
  form.points = z ? z.points.map((p: number[]) => [...p]) : []
  redraw()
}

function resetForm() {
  Object.assign(form, emptyForm())
  drawing.value = false
  redraw()
}

async function edit(z: any) {
  drawing.value = false
  Object.assign(form, {
    id: z.id,
    name: z.name,
    kind: z.kind,
    presetId: z.presetId ?? null,
    points: (z.points ?? []).map((p: number[]) => [...p]),
  })
  redraw()
  // Vùng gắn với một vị trí: quay camera tới đó để hình khớp với vùng đã vẽ
  if (z.presetId && z.presetId !== currentPresetId.value) await gotoPreset(z.presetId)
  redraw()
}

async function save() {
  saving.value = true
  try {
    const data = {
      cameraId: props.camera.id,
      presetId: form.presetId,
      name: form.name.trim(),
      kind: form.kind,
      points: form.points,
    }
    if (form.id) await editAiZoneApi(form.id, { ...data, id: form.id })
    else await addAiZoneApi(data)
    ElMessage.success(t('common.saveSuccess'))
    resetForm()
    await loadZones()
  } finally {
    saving.value = false
  }
}

async function remove(z: any) {
  await ElMessageBox.confirm(t('ai.zoneDeleteConfirm', { name: z.name }), t('common.notice'), { type: 'warning' })
  await deleteAiZoneApi(z.id)
  if (form.id === z.id) resetForm()
  await loadZones()
}
</script>

<style scoped>
.zone-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.zone-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}
.card-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-sub);
}
.ai-stream-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.position-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text-main);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.chip:hover:not(:disabled) {
  border-color: var(--primary);
}
.chip.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chip-count {
  min-width: 18px;
  padding: 0 5px;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 18%, transparent);
}

.zone-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
  gap: 12px;
  align-items: start;
}
@media (max-width: 900px) {
  .zone-layout {
    grid-template-columns: 1fr;
  }
}
.zone-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;
  border-radius: 12px;
}
.zone-video,
.zone-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.zone-video :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.zone-canvas {
  pointer-events: none;
}
.zone-canvas.is-drawing {
  pointer-events: auto;
  cursor: crosshair;
}
.stage-legend {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 10px;
  padding: 4px 10px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 999px;
  pointer-events: none;
}
.stage-legend span,
.kind-option {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.stage-legend i,
.kind-option i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.stage-tip {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.65);
  border-radius: 8px;
  pointer-events: none;
}

.zone-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.zone-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-sub);
}
.kind-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.kind-option {
  justify-content: center;
  padding: 7px 4px;
  font-size: 12px;
  color: var(--text-main);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
}
.kind-option.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.kind-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.apply-to {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}
.zone-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.zone-actions .el-button + .el-button {
  margin-left: 0;
}

.zone-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}
.list-count {
  min-width: 22px;
  padding: 0 7px;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  color: var(--primary);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.zone-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.zone-item:hover,
.zone-item.active {
  border-color: var(--primary);
}
.zone-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.zone-item-body {
  flex: 1;
  min-width: 0;
}
.zone-item-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.zone-item-sub {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
