<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import { useFitViewportHeight } from '@/hooks/web/useFitViewportHeight'
import { canAppendPolygonPoint, isSimplePolygon } from '@/utils/simplePolygon'
import {
  removeThermalAreaApi,
  getThermalAreasApi,
  invokePresetApi,
  listPresetsApi,
  saveThermalAreaApi,
  type ThermalAreaDto,
  type ThermalAreaListDto,
} from '@/api/camera'
import WebRTCPlayer from '@/components/Video/WebRTCPlayer.vue'

const props = defineProps<{
  camera: any
  /** Góc quay mở sẵn (presetId trên camera), ví dụ khi bấm "Vùng đo" ở tab góc quay */
  presetId?: number | null
}>()

const { t } = useLang()
const cameraId = computed(() => Number(props.camera.id))
const isFixed = computed(() => String(props.camera.ptzTypeObject?.code ?? props.camera.ptzType ?? '').toLowerCase() === 'fix' || String(props.camera.ptzType) === '2')

// Hình → mã AreaShapeType của hệ thống (1 đường, 3 chữ nhật, 4 đa giác, 5 điểm)
type ShapeKey = 'rectangle' | 'polygon' | 'line' | 'spot'
const SHAPE_CODE: Record<ShapeKey, number> = { line: 1, rectangle: 3, polygon: 4, spot: 5 }
const SHAPE_FIXED_POINTS: Partial<Record<ShapeKey, number>> = { rectangle: 2, line: 2, spot: 1 }
const supportedShapes = ref<number[] | null>(null)
const maxAreas = ref<number | null>(null)
const allShapeOptions = computed(() => [
  { value: 'rectangle', label: t('camera.ctaRectangle') },
  { value: 'polygon', label: t('camera.ctaPolygon') },
  { value: 'line', label: t('camera.ctaLine') },
  { value: 'spot', label: t('camera.ctaSpot') },
])
const shapeOptions = computed(() => allShapeOptions.value.filter((option) => supportedShapes.value?.includes(SHAPE_CODE[option.value as ShapeKey])))
const shapeKeyOf = (code: number): ShapeKey => (Object.entries(SHAPE_CODE).find(([, c]) => c === code)?.[0] as ShapeKey) ?? 'polygon'

// ----- Góc quay
const presets = ref<any[]>([])
const presetKey = ref<number>(0) // presetId trên camera; 0 = toàn cục
const currentPreset = computed(() => presets.value.find((p) => p.presetId === presetKey.value))
const presetOptions = computed(() => [
  { value: 0, label: t('camera.ctaGlobal') },
  ...presets.value.filter((p) => p.presetId > 0).map((p) => ({ value: p.presetId, label: `${p.presetId} - ${p.name}` })),
])
const busy = ref(false)

async function loadPresets() {
  const res: any = await listPresetsApi(cameraId.value)
  presets.value = res.data?.presets ?? []
  const requested = props.presetId != null && presets.value.some((p) => p.presetId === props.presetId) ? props.presetId : null
  presetKey.value = requested ?? presets.value.find((p) => p.presetId > 0)?.presetId ?? 0
}

const presetError = ref('')
async function selectPreset() {
  cancelSession()
  busy.value = true
  areasLoaded.value = false
  presetError.value = ''
  areasError.value = ''
  try {
    const preset = currentPreset.value
    if (preset && !isFixed.value) {
      await invokePresetApi({ cameraId: cameraId.value, presetId: preset.id })
    }
    await loadAreas()
  } catch (error: any) {
    areas.value = []
    supportedShapes.value = null
    maxAreas.value = null
    presetError.value = error?.response?.data?.message || error?.message || t('camera.ctaGotoFailed')
  } finally {
    busy.value = false
  }
}

watch(() => props.presetId, (id) => {
  if (id != null && id !== presetKey.value && presets.value.some((p) => p.presetId === id)) {
    presetKey.value = id
    void selectPreset()
  }
})

// ----- Vùng đã có trên camera
const areas = ref<ThermalAreaDto[]>([])
const loadingAreas = ref(false)
const areasError = ref('')
const areasLoaded = ref(false)
const isFull = computed(() => areasLoaded.value && maxAreas.value !== null && areas.value.length >= maxAreas.value)
const capabilitiesNotice = computed(() => {
  if (!areasLoaded.value || loadingAreas.value || areasError.value) return ''
  if (isFull.value) return t('camera.ctaFull')
  if (supportedShapes.value === null) return t('camera.ctaCapabilitiesUnknown')
  if (!shapeOptions.value.length) return t('camera.ctaShapesUnavailable')
  return ''
})
const canAddArea = computed(() => areasLoaded.value && shapeOptions.value.length > 0 && (maxAreas.value === null || areas.value.length < maxAreas.value))

async function loadAreas() {
  loadingAreas.value = true
  areasError.value = ''
  try {
    const data: unknown = (await getThermalAreasApi(cameraId.value, presetKey.value)).data
    // BE mới: data = { areas, maxAreas, shapes }; BE cũ: data = [...]
    const metadata = data && typeof data === 'object' && !Array.isArray(data) ? (data as Partial<ThermalAreaListDto>) : null
    const list = Array.isArray(data) ? data : metadata?.areas
    if (!Array.isArray(list) || (metadata?.shapes !== undefined && !Array.isArray(metadata.shapes))) {
      throw new Error(t('camera.ctaInvalidResponse'))
    }
    areas.value = list
    supportedShapes.value = metadata?.shapes ?? null
    maxAreas.value = typeof metadata?.maxAreas === 'number' && Number.isInteger(metadata.maxAreas) && metadata.maxAreas >= 0 ? metadata.maxAreas : null
    areasLoaded.value = true
  } catch (error: any) {
    areas.value = []
    areasLoaded.value = false
    supportedShapes.value = null
    maxAreas.value = null
    areasError.value = error?.response?.data?.message || error?.message || t('camera.ctaLoadFailed')
  } finally {
    loadingAreas.value = false
  }
}

// Video và lớp vẽ dùng chung kích thước gốc của luồng
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const hasVideoSize = computed(() => naturalWidth.value > 0 && naturalHeight.value > 0)
function onVideoSize(size: { width: number; height: number }) {
  naturalWidth.value = size.width
  naturalHeight.value = size.height
}

// ----- Phiên vẽ
const session = reactive<{ active: boolean; picking: boolean; areaId: number | null; name: string; shape: ShapeKey; points: { x: number; y: number }[] }>({
  active: false,
  picking: false,
  areaId: null,
  name: '',
  shape: 'rectangle',
  points: [],
})
const saving = ref(false)

function startNew() {
  if (loadingAreas.value || areasError.value || !canAddArea.value) return
  const shape = shapeOptions.value[0].value as ShapeKey
  Object.assign(session, { active: true, picking: true, areaId: null, name: '', shape, points: [] })
}
function startEdit(a: ThermalAreaDto) {
  if (!supportedShapes.value?.includes(a.shape)) return
  Object.assign(session, {
    active: true,
    picking: false,
    areaId: a.areaId,
    name: a.name,
    shape: shapeKeyOf(a.shape),
    points: a.points.map((p) => ({ ...p })),
  })
}
function cancelSession() {
  Object.assign(session, { active: false, picking: false, areaId: null, points: [] })
}
function redraw() {
  session.points = []
  session.picking = true
}
watch(() => session.shape, () => {
  if (session.active && session.areaId == null) redraw()
})

function onSvgClick(ev: MouseEvent) {
  if (ev.button !== 0 || !session.active || !session.picking || !hasVideoSize.value) return
  const svg = ev.currentTarget as SVGSVGElement
  const pt = svg.createSVGPoint()
  pt.x = ev.clientX
  pt.y = ev.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return
  const p = pt.matrixTransform(ctm.inverse())
  const x = Math.min(1, Math.max(0, p.x / naturalWidth.value))
  const y = Math.min(1, Math.max(0, p.y / naturalHeight.value))
  const next = { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }
  if (session.shape === 'polygon' && !canAppendPolygonPoint(session.points, next)) {
    ElMessage.warning(t('camera.ctaPolygonIntersection'))
    return
  }
  session.points.push(next)
  const fixed = SHAPE_FIXED_POINTS[session.shape]
  if (fixed && session.points.length >= fixed) session.picking = false
}

function finishPolygon() {
  if (!session.active || !session.picking || session.shape !== 'polygon') return
  if (session.points.length < 3) return ElMessage.warning(t('camera.ctaNeedPoints'))
  if (!isSimplePolygon(session.points)) return ElMessage.warning(t('camera.ctaPolygonCloseInvalid'))
  session.picking = false
}

const requiredOk = computed(() => {
  const fixed = SHAPE_FIXED_POINTS[session.shape]
  return fixed ? session.points.length === fixed : !session.picking && isSimplePolygon(session.points)
})

async function save() {
  if (!areasLoaded.value || loadingAreas.value || areasError.value || !supportedShapes.value?.includes(SHAPE_CODE[session.shape])) return
  if (session.areaId === null && !canAddArea.value) return
  if (!session.name.trim()) return ElMessage.warning(t('camera.ctaNeedName'))
  if (!requiredOk.value) return ElMessage.warning(t('camera.ctaNeedPoints'))
  saving.value = true
  try {
    await saveThermalAreaApi(cameraId.value, presetKey.value, {
      areaId: session.areaId,
      name: session.name.trim(),
      shape: SHAPE_CODE[session.shape],
      points: session.points,
    })
    ElMessage.success(t('camera.ctaSaved'))
    cancelSession()
    await loadAreas()
  } finally {
    saving.value = false
  }
}

async function remove(a: ThermalAreaDto) {
  try {
    await ElMessageBox.confirm(t('camera.ctaConfirmDelete', { name: a.name }), t('camera.ptmDelete'), { type: 'warning' })
  } catch {
    return
  }
  busy.value = true
  try {
    await removeThermalAreaApi(cameraId.value, presetKey.value, a.areaId as number)
    ElMessage.success(t('camera.ctaDeleted'))
    await loadAreas()
  } finally {
    busy.value = false
  }
}

// ----- Vẽ SVG
const px = (p: { x: number; y: number }) => `${p.x * naturalWidth.value},${p.y * naturalHeight.value}`
function pointsAttr(a: { points: { x: number; y: number }[]; shape: number }) {
  const pts = a.points
  // Chữ nhật 2 điểm chéo → 4 góc để vẽ
  if (a.shape === SHAPE_CODE.rectangle && pts.length === 2) {
    const [p, q] = pts
    return [px({ x: p.x, y: p.y }), px({ x: q.x, y: p.y }), px({ x: q.x, y: q.y }), px({ x: p.x, y: q.y })].join(' ')
  }
  return pts.map(px).join(' ')
}

// ----- Bố cục vừa màn hình
const rootRef = ref<HTMLElement>()
const { fitHeight, compact } = useFitViewportHeight(rootRef)
const stageStyle = computed(() => (hasVideoSize.value ? { aspectRatio: `${naturalWidth.value} / ${naturalHeight.value}` } : undefined))

onMounted(async () => {
  try {
    await loadPresets()
    await selectPreset()
  } catch (error: any) {
    presetError.value = error?.response?.data?.message || error?.message || t('camera.ctaLoadFailed')
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="cta"
    :class="{ 'cta--compact': compact }"
    :style="fitHeight ? { '--cta-height': `${fitHeight}px` } : undefined"
    v-loading="busy"
  >
    <div class="cta__workspace">
      <section class="cta__preview" :style="stageStyle" :aria-label="t('camera.ctaCameraImage')">
        <div class="cta__canvas">
          <WebRTCPlayer :key="cameraId" :stream-key="cameraId" :cam="camera" class="cta__player" @video-size="onVideoSize" />
          <svg
            v-if="hasVideoSize && session.active"
            class="cta__overlay"
            :class="{ 'is-picking': session.picking }"
            :viewBox="`0 0 ${naturalWidth} ${naturalHeight}`"
            preserveAspectRatio="xMidYMid meet"
            @click="onSvgClick"
            @contextmenu.prevent="finishPolygon"
          >
            <template v-if="session.points.length">
              <polygon
                v-if="(session.shape === 'rectangle' || (session.shape === 'polygon' && !session.picking)) && session.points.length >= 2"
                :points="pointsAttr({ points: session.points, shape: SHAPE_CODE[session.shape] })"
                class="cta__shape"
              />
              <polyline v-else-if="session.points.length >= 2" :points="pointsAttr({ points: session.points, shape: 1 })" class="cta__shape cta__shape--line" />
              <circle v-for="(p, i) in session.points" :key="i" :cx="p.x * naturalWidth" :cy="p.y * naturalHeight" r="7" class="cta__point" />
            </template>
          </svg>
        </div>
      </section>

      <aside class="cta__sidebar">
        <div class="cta__bar">
          <label class="cta__field">
            <span>{{ t('camera.ctaPreset') }}</span>
            <el-select v-model="presetKey" :disabled="session.active || busy || loadingAreas" @change="selectPreset">
              <el-option v-for="o in presetOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </label>
          <el-button :icon="Refresh" :title="t('camera.ctaReload')" :disabled="busy || loadingAreas || session.active || !!presetError" @click="loadAreas" />
        </div>

        <el-alert v-if="presetError" type="error" :closable="false" show-icon :title="presetError" />
        <el-alert v-if="areasError" type="error" :closable="false" show-icon :title="t('camera.ctaLoadFailed')" :description="areasError" />
        <el-alert v-if="capabilitiesNotice" type="warning" :closable="false" show-icon :title="capabilitiesNotice" />

        <div v-if="session.active" class="cta__card cta__editor">
          <div class="cta__card-head"><span class="cta__title">{{ t('camera.ctaConfiguration') }}</span></div>
          <el-form label-position="top" @submit.prevent>
            <el-form-item :label="t('camera.ctaName')"><el-input v-model="session.name" maxlength="64" /></el-form-item>
            <el-form-item :label="t('camera.ctaShape')">
              <el-select v-model="session.shape" :disabled="session.areaId != null" style="width: 100%">
                <el-option v-for="o in shapeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-form>
          <p class="cta__status">
            {{ session.picking ? t(session.shape === 'polygon' ? 'camera.ctaPolygonDrawingHint' : 'camera.ctaPicking') : t('camera.ctaPick') }}
            · {{ session.points.length }} {{ t('camera.ctaPoints') }}
          </p>
          <div class="cta__actions">
            <el-button v-if="session.picking && session.shape === 'polygon' && session.points.length >= 3" @click="finishPolygon">{{ t('camera.ctaFinish') }}</el-button>
            <el-button @click="redraw">{{ t('camera.ctaClear') }}</el-button>
            <el-button @click="cancelSession">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" :loading="saving" :disabled="loadingAreas || !!areasError || !requiredOk || !session.name.trim()" @click="save">{{ t('common.save') }}</el-button>
          </div>
        </div>

        <div class="cta__card cta__list" v-loading="loadingAreas">
          <div class="cta__card-head">
            <span class="cta__title">{{ t('camera.ctaAreas') }} <small>{{ areas.length }}{{ maxAreas !== null ? ` / ${maxAreas}` : '' }}</small></span>
            <el-button
              type="primary"
              :icon="Plus"
              :disabled="busy || session.active || loadingAreas || !!areasError || !!presetError || !canAddArea || !hasVideoSize"
              @click="startNew"
            >{{ t('camera.ctaAdd') }}</el-button>
          </div>
          <p v-if="!areas.length" class="cta__empty">{{ areasError || t('camera.ctaEmpty') }}</p>
          <div v-for="area in areas" :key="area.areaId ?? area.name" class="cta__area">
            <div class="cta__area-info">
              <strong>{{ area.name }}</strong>
              <span>ID {{ area.areaId }} · {{ allShapeOptions.find((option) => option.value === shapeKeyOf(area.shape))?.label }}</span>
            </div>
            <div class="cta__area-actions">
              <el-button link type="primary" :disabled="session.active || busy || loadingAreas || !supportedShapes?.includes(area.shape)" @click="startEdit(area)">{{ t('common.edit') }}</el-button>
              <el-button link type="danger" :disabled="session.active || busy" @click="remove(area)">{{ t('camera.ptmDelete') }}</el-button>
            </div>
          </div>
        </div>

        <details class="cta__help">
          <summary>{{ t('camera.ctaDrawingHelp') }}</summary>
          <p>{{ t('camera.ctaHint') }}</p>
        </details>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* Cả khối cao đúng phần màn hình còn lại; video co theo chiều cao, cột phải tự cuộn */
.cta {
  height: var(--cta-height, calc(100vh - 220px));
  min-height: 0;
}
.cta__bar { display: flex; align-items: flex-end; gap: 8px; }
.cta__field { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; }

/* Cột phải cố định, video lấy toàn bộ phần còn lại */
.cta__workspace { height: 100%; min-height: 0; display: flex; gap: 16px; }

/* Video lấp toàn bộ phần bên trái; lệch tỷ lệ thì có viền đen (object-fit: contain).
   aspect-ratio chỉ có tác dụng ở chế độ hẹp, khi chiều cao tự tính theo chiều rộng */
.cta__preview {
  flex: 7 1 0; /* 70% cho camera */
  min-width: 0;
  height: 100%;
  aspect-ratio: 16 / 9;
}
.cta__canvas {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #0f1424;
}
/* Bỏ khung trắng, dòng tên camera và tỷ lệ cố định của WebRTCPlayer để video lấp đầy khung */
.cta__player {
  width: 100%;
  height: 100%;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.cta__player :deep(.flex-wrap.m-0) { display: none; }
.cta__player :deep(.aspect-video) { height: 100%; aspect-ratio: auto; border: 0; border-radius: 0; }
.cta__player :deep(.aspect-video > div) { height: 100%; }
.cta__player :deep(video-stream) { display: block; width: 100%; height: 100%; }
.cta__player :deep(video) { width: 100% !important; height: 100% !important; object-fit: contain !important; }

/* Lớp vẽ phủ trên video, cùng hệ toạ độ gốc (meet = khớp với object-fit: contain) */
.cta__overlay { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 30; }
.cta__overlay.is-picking { cursor: crosshair; }
.cta__shape { fill: rgba(245, 108, 108, 0.25); stroke: #f56c6c; stroke-width: 3; stroke-dasharray: 6 4; }
.cta__shape--line { fill: none; }
.cta__point { fill: #f56c6c; }

/* Cột phải */
/* 30% cho chọn góc quay & danh sách vùng đo, tối thiểu 320px để không bị chật */
.cta__sidebar { flex: 3 1 0; min-width: 320px; min-height: 0; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 2px; }
.cta__sidebar > * { flex-shrink: 0; }
.cta__card { border: 1px solid var(--el-border-color-light); border-radius: 12px; background: var(--el-bg-color); padding: 12px; }
.cta__card-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.cta__title { font-weight: 650; font-size: 14px; }
.cta__title small { margin-left: 4px; color: var(--el-text-color-secondary); font-size: 12px; font-weight: 500; }
.cta__editor :deep(.el-form-item) { margin-bottom: 12px; }
.cta__status { margin: 0 0 10px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.cta__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.cta__actions :deep(.el-button) { margin: 0; }

.cta__area { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.cta__area:first-of-type { padding-top: 0; }
.cta__area:last-child { border-bottom: 0; padding-bottom: 0; }
.cta__area-info { flex: 1; min-width: 0; }
.cta__area-info strong { display: block; overflow-wrap: anywhere; font-size: 13px; font-weight: 600; }
.cta__area-info > span { display: block; margin-top: 4px; color: var(--el-text-color-secondary); font-size: 11px; line-height: 1.5; }
.cta__area-actions { display: flex; flex-shrink: 0; gap: 8px; }
.cta__area-actions :deep(.el-button) { margin: 0; }
.cta__empty { margin: 0; padding: 16px 0; text-align: center; color: var(--el-text-color-secondary); font-size: 13px; }

.cta__help { padding: 10px 12px; border: 1px solid var(--el-border-color-light); border-radius: 8px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.cta__help summary { cursor: pointer; }
.cta__help p { margin: 10px 0 0; }

/* Khung hẹp: video trên, cột dưới, cuộn trang bình thường */
.cta--compact { height: auto; }
.cta--compact .cta__workspace { flex-direction: column; }
.cta--compact .cta__preview { flex: none; width: 100%; height: auto; max-height: 55vh; }
.cta--compact .cta__sidebar { flex: none; min-width: 0; overflow: visible; }
</style>
