<template>
  <div class="area-manager">
    <div class="area-toolbar">
      <el-select v-model="presetId" :placeholder="t('camera.areaSelectPreset')" filterable class="area-preset" @change="onPresetChange">
        <el-option v-for="p in info.presets" :key="p.presetId" :label="`${p.name} (#${p.presetId})`" :value="p.presetId" />
      </el-select>
      <span class="area-count" v-if="presetId != null">
        {{ t('camera.areaCount') }}: {{ areas.length }}<template v-if="maxAreas != null"> / {{ maxAreas }}</template>
      </span>
    </div>
    <p class="area-hint">{{ t('camera.areaHint') }}</p>

    <div class="area-layout">
      <div class="area-stage" v-loading="streamLoading">
        <div ref="videoRef" class="area-video"></div>
        <canvas
          ref="canvasRef"
          class="area-canvas"
          :class="{ 'is-drawing': drawing }"
          @click="onCanvasClick"
          @dblclick.prevent="finishDrawing"
          @contextmenu.prevent="undoPoint"
        ></canvas>
      </div>

      <div class="area-side" v-loading="loadingAreas">
        <el-empty v-if="presetId == null" :description="t('camera.areaSelectPresetHint')" :image-size="60" />
        <template v-else>
          <div class="area-form">
            <el-input v-model="form.name" :placeholder="t('camera.zoneName')" />
            <el-radio-group v-model="form.shape" size="small" :disabled="drawing" @change="resetPoints">
              <el-radio-button v-for="s in shapeOptions" :key="s.value" :value="s.value">{{ s.label }}</el-radio-button>
            </el-radio-group>
            <div class="area-actions">
              <el-button v-if="!drawing" type="primary" plain :disabled="!canStartNew" @click="startDrawing">
                {{ form.points.length ? t('camera.redraw') : t('camera.drawZone') }}
              </el-button>
              <template v-else>
                <el-button type="success" :disabled="!canFinish" @click="finishDrawing">{{ t('camera.areaFinish') }}</el-button>
                <el-button @click="undoPoint">{{ t('camera.areaUndo') }}</el-button>
                <el-button @click="cancelDrawing">{{ t('common.cancel') }}</el-button>
              </template>
              <el-button type="primary" :disabled="!canSave" :loading="saving" @click="save">
                {{ form.areaId != null ? t('common.update') : t('common.addNew') }}
              </el-button>
              <el-button v-if="form.areaId != null || form.points.length" @click="resetForm">{{ t('camera.areaNew') }}</el-button>
            </div>
            <div v-if="!canStartNew" class="area-tip area-tip--warn">{{ t('camera.areaFull') }}</div>
            <div v-else-if="drawing" class="area-tip">{{ drawTip }}</div>
          </div>

          <el-empty v-if="!areas.length" :description="t('camera.areaEmpty')" :image-size="50" />
          <div v-for="a in areas" :key="a.areaId" class="area-item" :class="{ active: a.areaId === form.areaId }" @click="edit(a)">
            <span class="area-dot"></span>
            <div class="area-item-body">
              <div class="area-item-name">{{ a.name || `#${a.areaId}` }}</div>
              <div class="area-item-sub">#{{ a.areaId }} · {{ shapeLabel(a.shape) }}</div>
            </div>
            <el-button circle size="small" type="danger" :icon="Delete" @click.stop="remove(a)" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import { prepareCameraStream } from '@/plugins/webRTC/cameraStream'
import { getThermalAreasApi, invokePresetApi, removeThermalAreaApi, saveThermalAreaApi } from '@/api/camera'

const { t } = useLang()

const props = defineProps<{
  cameraId: string | number
  info: { presets?: any[]; cameraTours?: any[] }
}>()

// Mã hình trùng AreaShapeType phía backend
const SHAPE = { Line: 1, Rectangle: 3, Polygon: 4, Spot: 5 } as const
const DRAWABLE = [SHAPE.Spot, SHAPE.Line, SHAPE.Rectangle, SHAPE.Polygon]

const videoRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const streamLoading = ref(true)
const videoStream = document.createElement('video-stream') as any

const presetId = ref<number | null>(null)
const areas = ref<any[]>([])
const maxAreas = ref<number | null>(null)
const shapes = ref<number[]>([])
const loadingAreas = ref(false)
const saving = ref(false)
const drawing = ref(false)

const emptyForm = () => ({ areaId: null as number | null, name: '', shape: SHAPE.Polygon as number, points: [] as number[][] })
const form = reactive(emptyForm())

const shapeLabel = (s: number) => t(`camera.areaShapes.${s}`)
const shapeOptions = computed(() =>
  (shapes.value.length ? shapes.value : [SHAPE.Polygon]).filter((s) => DRAWABLE.includes(s as any)).map((s) => ({ value: s, label: shapeLabel(s) })),
)

const needPoints = computed(() => ({ [SHAPE.Spot]: 1, [SHAPE.Line]: 2, [SHAPE.Rectangle]: 2, [SHAPE.Polygon]: 3 })[form.shape] ?? 3)
const autoFinish = computed(() => form.shape !== SHAPE.Polygon)
const canFinish = computed(() => form.points.length >= needPoints.value)
const canSave = computed(() => !!form.name.trim() && form.points.length >= needPoints.value && !drawing.value)
const atLimit = computed(() => maxAreas.value != null && areas.value.length >= maxAreas.value && form.areaId == null)
const canStartNew = computed(() => !atLimit.value)
const drawTip = computed(() =>
  form.shape === SHAPE.Polygon
    ? t('camera.areaTipPolygon')
    : form.shape === SHAPE.Spot
      ? t('camera.areaTipSpot')
      : form.shape === SHAPE.Rectangle
        ? t('camera.areaTipRect')
        : t('camera.areaTipLine'),
)

onMounted(async () => {
  videoStream.addEventListener('stream-onopen', () => {
    streamLoading.value = false
    nextTick(fitCanvas)
  })
  videoStream.addEventListener('stream-error', () => (streamLoading.value = false))
  try {
    await prepareCameraStream(videoStream, props.cameraId)
    videoRef.value?.appendChild(videoStream)
  } catch {
    streamLoading.value = false
  }
  window.addEventListener('resize', fitCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitCanvas)
  videoStream.src = ''
  videoStream.remove()
})

// Vùng đo vẽ theo góc quay: đưa camera tới preset đó rồi mới đọc/vẽ để hình khớp khung nhìn.
async function onPresetChange() {
  resetForm()
  areas.value = []
  if (presetId.value == null) return
  loadingAreas.value = true
  try {
    await invokePresetApi({ cameraId: props.cameraId, presetId: presetId.value })
    await loadAreas()
  } finally {
    loadingAreas.value = false
  }
}

async function loadAreas() {
  const data: any = (await getThermalAreasApi(props.cameraId, presetId.value!)).data
  areas.value = data?.areas ?? []
  maxAreas.value = data?.maxAreas ?? null
  shapes.value = data?.shapes ?? []
  if (!shapeOptions.value.some((s) => s.value === form.shape)) form.shape = shapeOptions.value[0]?.value ?? SHAPE.Polygon
  redraw()
}

function fitCanvas() {
  const c = canvasRef.value
  const box = videoRef.value
  if (!c || !box) return
  c.width = box.clientWidth
  c.height = box.clientHeight
  redraw()
}

// Hộp bao của mọi điểm — dùng cho hình chữ nhật (camera có thể trả 2 điểm chéo hoặc 4 góc)
function bounds(pts: number[][]) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

function drawShape(ctx: CanvasRenderingContext2D, pts: number[][], shape: number, color: string, closed: boolean) {
  const { width: w, height: h } = ctx.canvas
  if (!pts.length) return
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.fillStyle = color + '33'
  if (shape === SHAPE.Spot) {
    ctx.beginPath()
    ctx.arc(pts[0][0] * w, pts[0][1] * h, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    return
  }
  if (shape === SHAPE.Rectangle && pts.length >= 2) {
    const b = bounds(pts)
    ctx.beginPath()
    ctx.rect(b.x0 * w, b.y0 * h, (b.x1 - b.x0) * w, (b.y1 - b.y0) * h)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)))
    if (closed && shape === SHAPE.Polygon && pts.length >= 3) {
      ctx.closePath()
      ctx.fill()
    }
    ctx.stroke()
  }
  ctx.fillStyle = color
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
  areas.value
    .filter((a) => a.areaId !== form.areaId)
    .forEach((a) => drawShape(ctx, (a.points ?? []).map((p: any) => [p.x, p.y]), a.shape, '#3b82f6', true))
  drawShape(ctx, form.points, form.shape, form.areaId != null ? '#22c55e' : '#f59e0b', !drawing.value)
}

function startDrawing() {
  form.points = []
  drawing.value = true
  redraw()
}

function resetPoints() {
  form.points = []
  redraw()
}

function onCanvasClick(e: MouseEvent) {
  if (!drawing.value) return
  const r = canvasRef.value!.getBoundingClientRect()
  const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
  // dblclick cũng bắn 2 click; bỏ điểm trùng liền kề
  const last = form.points[form.points.length - 1]
  if (last && Math.abs(last[0] - x) < 0.005 && Math.abs(last[1] - y) < 0.005) return
  form.points.push([+x.toFixed(4), +y.toFixed(4)])
  redraw()
  if (autoFinish.value && form.points.length === needPoints.value) finishDrawing()
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
  const a = areas.value.find((x) => x.areaId === form.areaId)
  form.points = a ? a.points.map((p: any) => [p.x, p.y]) : []
  redraw()
}

function resetForm() {
  Object.assign(form, emptyForm(), { shape: shapeOptions.value[0]?.value ?? SHAPE.Polygon })
  drawing.value = false
  redraw()
}

function edit(a: any) {
  drawing.value = false
  Object.assign(form, {
    areaId: a.areaId,
    name: a.name ?? '',
    shape: a.shape,
    points: (a.points ?? []).map((p: any) => [p.x, p.y]),
  })
  redraw()
}

async function save() {
  saving.value = true
  try {
    await saveThermalAreaApi(props.cameraId, presetId.value!, {
      areaId: form.areaId,
      name: form.name.trim(),
      shape: form.shape,
      points: form.points.map(([x, y]) => ({ x, y })),
    })
    ElMessage.success(t('common.saveSuccess'))
    resetForm()
    await loadAreas()
  } finally {
    saving.value = false
  }
}

async function remove(a: any) {
  await ElMessageBox.confirm(`${t('common.delWarning')} "${a.name || a.areaId}"?`, t('common.notice'), { type: 'warning' })
  await removeThermalAreaApi(props.cameraId, presetId.value!, a.areaId)
  if (form.areaId === a.areaId) resetForm()
  await loadAreas()
}
</script>

<style scoped>
.area-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.area-preset {
  width: 320px;
  max-width: 100%;
}
.area-count {
  font-size: 13px;
  color: var(--text-sub);
}
.area-hint {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-sub);
}
.area-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(260px, 2fr);
  gap: 16px;
}
@media (max-width: 900px) {
  .area-layout {
    grid-template-columns: 1fr;
  }
}
.area-stage {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #000;
  border-radius: 12px;
}
.area-video,
.area-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.area-video :deep(video) {
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.area-canvas {
  pointer-events: none;
}
.area-canvas.is-drawing {
  pointer-events: auto;
  cursor: crosshair;
}
.area-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
}
.area-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}
.area-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.area-tip {
  font-size: 12px;
  color: var(--text-sub);
}
.area-tip--warn {
  color: var(--el-color-warning);
}
.area-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: pointer;
}
.area-item.active {
  border-color: var(--primary);
}
.area-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  flex-shrink: 0;
}
.area-item-body {
  flex: 1;
  min-width: 0;
}
.area-item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}
.area-item-sub {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
