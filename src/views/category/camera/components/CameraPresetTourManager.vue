<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Location, VideoCamera, ZoomIn, ZoomOut, Plus, Refresh, EditPen, Delete, List, Position, Aim } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import { useCameraPtz } from '@/hooks/web/useCameraPtz'
import { useFitViewportHeight } from '@/hooks/web/useFitViewportHeight'
import {
  getCameraDetailApi,
  getTourSpeedApi,
  invokePresetApi,
  listPresetsApi,
  playTourApi,
  removePresetApi,
  removeTourApi,
  savePresetApi,
  saveTourApi,
  syncPresetsApi,
} from '@/api/camera'
import WebRTCPlayer from '@/components/Video/WebRTCPlayer.vue'
import { PTZ_SPEED_DEFAULT_PERCENT, toPtzSpeed } from '@/constants/camera'

const props = defineProps<{
  camera: any
  // PtzSetupSource: 0 = Auto, 1 = API hãng, 2 = ONVIF (chọn ở đầu trang cài đặt)
  source: number
}>()

const emit = defineEmits<{
  (e: 'edit-zones', preset: any): void
}>()

const { t } = useLang()

// ── Chọn camera (camera chính hoặc camera tích hợp) ──
const selectedCameraId = ref<number>(Number(props.camera.id))
const fetchedIntegratedCam = ref<any>(null)

onMounted(async () => {
  if (props.camera?.integratedCamId && !props.camera?.integratedCam) {
    try {
      fetchedIntegratedCam.value = (await getCameraDetailApi(props.camera.integratedCamId)).data
    } catch {
      // Không có camera tích hợp thì chỉ dùng camera chính
    }
  }
  void loadPresets()
})

const integratedCam = computed(() => props.camera?.integratedCam || fetchedIntegratedCam.value)

function cameraLabel(cam: any) {
  const ptz = cam.ptzTypeObject?.name || ''
  return `${cam.name} (ID ${cam.id}${ptz ? ` - ${ptz}` : ''})`
}

const cameraOptions = computed(() => {
  const list = [{ id: Number(props.camera.id), name: cameraLabel(props.camera) }]
  if (integratedCam.value) list.push({ id: Number(integratedCam.value.id), name: cameraLabel(integratedCam.value) })
  return list
})

const selectedCamera = computed(() =>
  integratedCam.value && selectedCameraId.value === Number(integratedCam.value.id) ? integratedCam.value : props.camera
)
const selectedCameraName = computed(() => cameraOptions.value.find((c) => c.id === selectedCameraId.value)?.name ?? '')

const isPtzCamera = computed(() => {
  const v = String(selectedCamera.value?.ptzTypeObject?.code ?? selectedCamera.value?.ptzType ?? '').toLowerCase()
  return v === 'ptz' || v === '1'
})
const isDahua = computed(() => ['dahua', '2'].includes(String(selectedCamera.value?.brand ?? '').toLowerCase()))

// ── Dữ liệu preset & tour của camera đang chọn ──
const presets = ref<any[]>([])
const tours = ref<any[]>([])
const loading = ref(false)
const busy = ref(false)
const managementTab = ref('presets')

function applyData(data: any) {
  presets.value = data?.presets ?? []
  tours.value = data?.cameraTours ?? []
}

async function loadPresets() {
  loading.value = true
  try {
    applyData((await listPresetsApi(selectedCameraId.value)).data)
  } finally {
    loading.value = false
  }
}

watch(selectedCameraId, () => {
  activePresetId.value = null
  runningTourId.value = null
  void loadPresets()
})

// Dải tốc độ tour do plugin của hãng khai báo; hãng không có tốc độ thì ẩn ô nhập
const tourSpeed = ref({ supported: false, min: 1, max: 7, default: 1 })
async function loadTourSpeed() {
  try {
    tourSpeed.value = (await getTourSpeedApi(selectedCameraId.value, props.source)).data ?? tourSpeed.value
  } catch {
    tourSpeed.value = { ...tourSpeed.value, supported: false }
  }
}
onMounted(loadTourSpeed)
watch([selectedCameraId, () => props.source], loadTourSpeed)

const activePresetId = ref<number | null>(null)
const invokingPresetId = ref<number | null>(null)
const runningTourId = ref<number | null>(null)

// Preset "Fix" (presetId 0) là vị trí gốc, không thêm/xoá được
const editablePresets = computed(() => presets.value.filter((p) => p.presetId > 0))
const activePreset = computed(() => presets.value.find((p) => p.presetId === activePresetId.value))

// ── Điều khiển PTZ trên video ──
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

// Tab này không có thanh tốc độ: dùng mức mặc định của thanh tốc độ (50% → 0.5)
const { startCommand, stopCommand } = useCameraPtz(() => selectedCameraId.value, () => toPtzSpeed(PTZ_SPEED_DEFAULT_PERCENT))

// ── Gọi preset & chạy tour ──
async function gotoPreset(row: any) {
  if (!row || row.id == null) return
  invokingPresetId.value = row.presetId
  try {
    // API nhận id bản ghi trong DB rồi tự gọi số preset trên camera
    await invokePresetApi({ cameraId: selectedCameraId.value, presetId: row.id })
    activePresetId.value = row.presetId
    ElMessage.success(t('camera.ptmGotoDone'))
  } finally {
    invokingPresetId.value = null
  }
}

async function toggleTour(row: any) {
  if (!row || row.tourId == null) return
  const isRunning = runningTourId.value === row.tourId
  await playTourApi({ cameraId: selectedCameraId.value, tourId: row.tourId, command: isRunning ? 'stop' : 'run' })
  runningTourId.value = isRunning ? null : row.tourId
  ElMessage.success(t(isRunning ? 'camera.ptmTourStopped' : 'camera.ptmTourRunning'))
}

async function handleSync() {
  busy.value = true
  try {
    await syncPresetsApi(selectedCameraId.value)
    ElMessage.success(t('camera.ptmSynced'))
    await loadPresets()
  } finally {
    busy.value = false
  }
}

async function run(task: () => Promise<any>, successKey: string): Promise<boolean> {
  busy.value = true
  try {
    const res = await task()
    // BE thường trả lại danh sách đã đồng bộ từ camera; trả dạng khác thì tải lại để không làm trống bảng
    if (Array.isArray(res?.data?.presets)) applyData(res.data)
    else await loadPresets()
    ElMessage.success(t(successKey))
    return true
  } catch {
    return false
  } finally {
    busy.value = false
  }
}

async function confirmDelete(name: string) {
  try {
    await ElMessageBox.confirm(t('camera.ptmConfirmDelete', { name }), t('camera.ptmDelete'), { type: 'warning' })
    return true
  } catch {
    return false
  }
}

// ── Dialog preset ──
const presetDialog = ref(false)
const presetForm = reactive<{ name: string; presetId: number | null; editing: boolean }>({ name: '', presetId: null, editing: false })
function openPreset(row?: any) {
  presetForm.name = row?.name ?? ''
  presetForm.presetId = row?.presetId ?? null
  presetForm.editing = !!row
  presetDialog.value = true
}
async function submitPreset() {
  const name = presetForm.name.trim()
  if (!name) return
  const countBefore = presets.value.length
  const ok = await run(
    () => savePresetApi(selectedCameraId.value, { name, presetId: presetForm.presetId, source: props.source }),
    'common.saveSuccess'
  )
  if (!ok) return
  presetDialog.value = false
  // Danh sách sau khi lưu là BE đồng bộ lại từ camera: không thấy preset vừa lưu nghĩa là camera không giữ nó
  // Tự động cấp số: có camera không lưu tên, nên thêm được một preset mới cũng tính là đã lưu
  const saved = presetForm.presetId != null
    ? presets.value.some((p) => p.presetId === presetForm.presetId)
    : presets.value.some((p) => p.name === name) || presets.value.length > countBefore
  if (!saved) ElMessage.warning({ message: t('camera.ptmNotOnCamera'), duration: 8000 })
}
async function removePreset(row: any) {
  if (await confirmDelete(row.name)) {
    await run(() => removePresetApi(selectedCameraId.value, row.presetId, props.source), 'camera.ptmDeleted')
  }
}

// ── Dialog tour ──
const tourDialog = ref(false)
const editingTour = ref(false)
type TourStep = { presetId: number | null; stayTimeSeconds: number; speed: number | null }
const tourForm = reactive<{ tourId: number | null; name: string; steps: TourStep[] }>({
  tourId: null,
  name: '',
  steps: [],
})
const newStep = (): TourStep => ({ presetId: null, stayTimeSeconds: 5, speed: tourSpeed.value.supported ? tourSpeed.value.default : null })
function moveStep(i: number, d: number) {
  const [item] = tourForm.steps.splice(i, 1)
  tourForm.steps.splice(i + d, 0, item)
}
function openTour(row?: any) {
  editingTour.value = !!row
  tourForm.tourId = row?.tourId ?? null
  tourForm.name = row?.tourName ?? ''
  tourForm.steps = row
    ? [...(row.cameraTourPresets ?? [])]
        .sort((a: any, b: any) => a.orderNumber - b.orderNumber)
        .map((s: any) => ({
          // presetId trong bước tour là id bản ghi preset (DB), còn ô chọn dùng số preset trên camera → đổi lại
          presetId: presets.value.find((p) => p.id === s.presetId)?.presetId ?? null,
          stayTimeSeconds: s.stayTime || 5,
          speed: s.speed ?? (tourSpeed.value.supported ? tourSpeed.value.default : null),
        }))
    : [newStep()]
  tourDialog.value = true
}
async function submitTour() {
  const steps = tourForm.steps
    .filter((s) => s.presetId != null)
    .map((s) => ({ presetId: s.presetId as number, stayTimeSeconds: s.stayTimeSeconds, speed: tourSpeed.value.supported ? s.speed ?? null : null }))
  if (!tourForm.name.trim()) return
  if (isDahua.value && tourForm.tourId == null) {
    ElMessage.warning(t('camera.ptmNeedTourNumber'))
    return
  }
  if (!steps.length) {
    ElMessage.warning(t('camera.ptmNeedSteps'))
    return
  }
  const ok = await run(
    () => saveTourApi(selectedCameraId.value, { tourId: tourForm.tourId, name: tourForm.name.trim(), steps, source: props.source }),
    'common.saveSuccess'
  )
  if (ok) tourDialog.value = false
}
async function removeTour(row: any) {
  if (await confirmDelete(row.tourName)) {
    await run(() => removeTourApi(selectedCameraId.value, row.tourId, props.source), 'camera.ptmDeleted')
  }
}
function stepText(row: any) {
  return [...(row.cameraTourPresets ?? [])]
    .sort((a: any, b: any) => a.orderNumber - b.orderNumber)
    .map((s: any) => `${s.name ?? s.presetId} (${s.stayTime}s${s.speed != null ? ` · v${s.speed}` : ''})`)
    .join(' → ')
}

// ── Chiều cao vừa phần màn hình còn lại (tính từ đỉnh component tới đáy cửa sổ) để không phải cuộn trang ──
const rootRef = ref<HTMLElement>()
// Khung hẹp (màn nhỏ hoặc phóng to trình duyệt): video trên, panel dưới, cuộn trang bình thường
const { fitHeight, compact } = useFitViewportHeight(rootRef)
// Khung video theo đúng tỷ lệ của luồng (camera nhiệt thường 4:3) để D-pad/zoom nằm trên hình, không nằm trên viền đen
const videoAspect = ref<string | null>(null)
function onVideoSize(size: { width: number; height: number }) {
  videoAspect.value = `${size.width} / ${size.height}`
}

defineExpose({ reload: loadPresets })
</script>

<template>
  <div
    ref="rootRef"
    class="ptm"
    :class="{ 'ptm--compact': compact }"
    :style="fitHeight ? { '--ptm-height': `${fitHeight}px` } : undefined"
    v-loading="busy || loading"
  >
    <!-- Bên trái: video trực tiếp của camera đang chọn -->
    <section class="ptm__video" :style="videoAspect ? { aspectRatio: videoAspect } : undefined">
      <div class="ptm__stage">
        <WebRTCPlayer :key="selectedCameraId" :stream-key="selectedCameraId" :cam="selectedCamera" class="ptm__player" @video-size="onVideoSize" />

        <div v-if="activePreset" class="ptm__active-badge">
          <el-icon><Location /></el-icon>
          <span>{{ activePreset.presetId }} - {{ activePreset.name }}</span>
        </div>

        <div v-if="isPtzCamera" class="ptm__dpad" role="group" :aria-label="t('camera.ptmPtzControls')">
          <button
            v-for="direction in directions"
            :key="direction.command"
            class="ptm__direction"
            type="button"
            :aria-label="direction.command"
            :style="{ gridRow: direction.row, gridColumn: direction.column, '--direction-rotation': `${direction.rotation}deg` }"
            @pointerdown="startCommand(direction.command)"
            @pointerup="stopCommand"
            @pointerleave="stopCommand"
            @pointercancel="stopCommand"
          >
            <el-icon><ArrowUp /></el-icon>
          </button>
          <span class="ptm__dpad-center">PTZ</span>
        </div>

        <div v-if="isPtzCamera" class="ptm__zoom">
          <el-button circle :icon="ZoomIn" aria-label="Zoom in" @pointerdown.prevent="startCommand('ZoomIn')" @pointerup="stopCommand" @pointerleave="stopCommand" @pointercancel="stopCommand" />
          <el-button circle :icon="ZoomOut" aria-label="Zoom out" @pointerdown.prevent="startCommand('ZoomOut')" @pointerup="stopCommand" @pointerleave="stopCommand" @pointercancel="stopCommand" />
        </div>

        <p v-if="!isPtzCamera" class="ptm__hint">{{ t('camera.ptmNotPtz') }}</p>
      </div>
    </section>

    <!-- Bên phải: quản lý góc quay & tour -->
    <div class="ptm__manage">
      <div class="ptm__bar">
        <div v-if="cameraOptions.length === 1" class="ptm__target" :title="selectedCameraName">
          <el-icon><VideoCamera /></el-icon><span>{{ selectedCameraName }}</span>
        </div>
        <div v-else class="ptm__camera-select">
          <label><el-icon><VideoCamera /></el-icon>{{ t('camera.ptmSelectCamera') }}</label>
          <el-select v-model="selectedCameraId">
            <el-option v-for="cam in cameraOptions" :key="cam.id" :label="cam.name" :value="cam.id" />
          </el-select>
        </div>
        <el-button :icon="Refresh" :disabled="busy || loading" @click="handleSync">{{ t('camera.syncPresets') }}</el-button>
      </div>

      <el-tabs v-model="managementTab" class="ptm__tabs" stretch>
        <el-tab-pane name="presets">
          <template #label>
            <span class="ptm__tab-label"><el-icon><Location /></el-icon>{{ t('camera.ptmPresets') }}<span class="ptm__count">{{ editablePresets.length }}</span></span>
          </template>
          <div class="ptm__card">
            <div class="ptm__head">
              <span class="ptm__title">{{ t('camera.ptmPresets') }}</span>
              <el-button type="primary" :icon="Plus" :disabled="busy || loading" @click="openPreset()">{{ t('camera.ptmAddPreset') }}</el-button>
            </div>
            <el-table
              :data="editablePresets"
              size="small"
              :empty-text="t('camera.ptmNoData')"
              :row-class-name="({ row }: any) => (activePresetId === row.presetId ? 'ptm__row--active' : '')"
              class="ptm__table ptm__table--clickable"
              @row-click="gotoPreset"
            >
              <el-table-column prop="presetId" :label="t('camera.ptmNumber')" width="54">
                <template #default="{ row }"><span class="ptm__number">{{ row.presetId }}</span></template>
              </el-table-column>
              <el-table-column prop="name" :label="t('camera.ptmName')" min-width="110">
                <template #default="{ row }">
                  <div class="ptm__preset-name">
                    <span :title="row.name">{{ row.name }}</span>
                    <el-tag v-if="activePresetId === row.presetId" size="small" type="success" effect="plain">{{ t('camera.ptmViewing') }}</el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column width="190" align="right">
                <template #default="{ row }">
                  <el-button
                    class="ptm__goto"
                    size="small"
                    plain
                    type="primary"
                    :icon="Position"
                    :disabled="busy || invokingPresetId === row.presetId"
                    :loading="invokingPresetId === row.presetId"
                    @click.stop="gotoPreset(row)"
                  >{{ t('camera.ptmGoto') }}</el-button>
                  <el-button class="ptm__icon-action" text :icon="Aim" :title="t('camera.ptmZones')" :disabled="busy" @click.stop="emit('edit-zones', row)" />
                  <el-button class="ptm__icon-action" text :icon="EditPen" :title="t('common.update')" :disabled="busy" @click.stop="openPreset(row)" />
                  <el-button class="ptm__icon-action" text type="danger" :icon="Delete" :title="t('camera.ptmDelete')" :disabled="busy" @click.stop="removePreset(row)" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane name="tours">
          <template #label>
            <span class="ptm__tab-label"><el-icon><List /></el-icon>{{ t('camera.ptmTours') }}<span class="ptm__count">{{ tours.length }}</span></span>
          </template>
          <div class="ptm__card">
            <div class="ptm__head">
              <span class="ptm__title">{{ t('camera.ptmTours') }}</span>
              <el-button type="primary" :icon="Plus" :disabled="busy || loading" @click="openTour()">{{ t('camera.ptmAddTour') }}</el-button>
            </div>
            <el-table :data="tours" size="small" :empty-text="t('camera.ptmNoData')" class="ptm__table">
              <el-table-column prop="tourId" :label="t('camera.ptmNumber')" width="54" />
              <el-table-column prop="tourName" :label="t('camera.ptmName')" min-width="130">
                <template #default="{ row }">
                  <div class="ptm__tour-name">{{ row.tourName }}</div>
                  <div class="ptm__tour-route" :title="stepText(row)">{{ stepText(row) }}</div>
                </template>
              </el-table-column>
              <el-table-column width="170" align="right">
                <template #default="{ row }">
                  <el-button
                    class="ptm__goto"
                    size="small"
                    plain
                    :type="runningTourId === row.tourId ? 'warning' : 'success'"
                    :disabled="busy"
                    @click.stop="toggleTour(row)"
                  >{{ t(runningTourId === row.tourId ? 'camera.ptmStopTour' : 'camera.ptmRunTour') }}</el-button>
                  <el-button class="ptm__icon-action" text :icon="EditPen" :title="t('common.update')" :disabled="busy" @click.stop="openTour(row)" />
                  <el-button class="ptm__icon-action" text type="danger" :icon="Delete" :title="t('camera.ptmDelete')" :disabled="busy" @click.stop="removeTour(row)" />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Dialog lưu/đổi tên preset -->
    <el-dialog v-model="presetDialog" :title="t(presetForm.editing ? 'camera.ptmEditPresetTitle' : 'camera.ptmAddPresetTitle')" width="460px" class="ptm__dialog" append-to-body>
      <div class="ptm__dialog-target">
        <el-icon><VideoCamera /></el-icon>
        <span>{{ t('camera.ptmSaveFor') }}: <strong>{{ selectedCameraName }}</strong></span>
      </div>
      <el-alert v-if="!presetForm.editing" type="info" :closable="false" show-icon :title="t('camera.ptmPresetHint')" class="ptm__alert" />
      <el-form label-position="top" @submit.prevent="submitPreset">
        <el-form-item :label="t('camera.ptmName')"><el-input v-model="presetForm.name" maxlength="64" /></el-form-item>
        <el-form-item :label="t('camera.ptmNumber')">
          <el-input-number v-model="presetForm.presetId" :min="1" :max="400" :disabled="presetForm.editing" controls-position="right" :placeholder="t('camera.ptmNumberAuto')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="presetDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="busy" :disabled="!presetForm.name.trim()" @click="submitPreset">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- Dialog thêm/sửa tour -->
    <el-dialog v-model="tourDialog" :title="t(editingTour ? 'camera.ptmEditTour' : 'camera.ptmAddTour')" width="640px" class="ptm__dialog" append-to-body>
      <div class="ptm__dialog-target">
        <el-icon><VideoCamera /></el-icon>
        <span>{{ t('camera.ptmSaveFor') }}: <strong>{{ selectedCameraName }}</strong></span>
      </div>
      <el-alert type="info" :closable="false" show-icon :title="t('camera.ptmTourHint')" class="ptm__alert" />
      <el-form label-position="top" @submit.prevent>
        <div class="ptm__row">
          <el-form-item :label="t('camera.ptmName')" class="ptm__grow"><el-input v-model="tourForm.name" maxlength="64" /></el-form-item>
          <el-form-item :label="t('camera.ptmNumber')" :required="isDahua">
            <el-input-number
              v-model="tourForm.tourId"
              :min="1"
              :disabled="editingTour"
              controls-position="right"
              :placeholder="t(isDahua ? 'camera.ptmNumberRequired' : 'camera.ptmNumberAuto')"
            />
          </el-form-item>
        </div>
        <el-form-item :label="t('camera.ptmSteps')">
          <div class="ptm__steps">
            <div v-if="tourForm.steps.length" class="ptm__step-legend">
              <span class="ptm__grow">{{ t('camera.preset') }}</span>
              <span class="ptm__num">{{ t('camera.ptmStay') }}</span>
              <span v-if="tourSpeed.supported" class="ptm__num">{{ t('camera.tourSpeed') }} ({{ tourSpeed.min }}–{{ tourSpeed.max }})</span>
              <span class="ptm__step-actions"></span>
            </div>
            <div v-for="(step, i) in tourForm.steps" :key="i" class="ptm__row">
              <el-select v-model="step.presetId" :placeholder="t('camera.preset')" class="ptm__grow">
                <el-option v-for="p in editablePresets" :key="p.presetId" :label="`${p.presetId} - ${p.name}`" :value="p.presetId" />
              </el-select>
              <el-input-number v-model="step.stayTimeSeconds" class="ptm__num" :min="1" :max="255" controls-position="right" :aria-label="t('camera.ptmStay')" :title="t('camera.ptmStay')" />
              <el-input-number
                v-if="tourSpeed.supported"
                v-model="step.speed"
                class="ptm__num"
                :min="tourSpeed.min"
                :max="tourSpeed.max"
                controls-position="right"
                :aria-label="t('camera.tourSpeed')"
                :title="`${t('camera.tourSpeed')} ${tourSpeed.min}-${tourSpeed.max}`"
              />
              <el-button class="ptm__step-btn" text :icon="ArrowUp" :disabled="i === 0" @click="moveStep(i, -1)" />
              <el-button class="ptm__step-btn" text :icon="ArrowDown" :disabled="i === tourForm.steps.length - 1" @click="moveStep(i, 1)" />
              <el-button class="ptm__step-btn" text type="danger" :icon="Delete" :title="t('camera.ptmDelete')" @click="tourForm.steps.splice(i, 1)" />
            </div>
            <el-button link type="primary" @click="tourForm.steps.push(newStep())">{{ t('camera.ptmAddStep') }}</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tourDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="busy" :disabled="!tourForm.name.trim()" @click="submitTour">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* Cả khối cao đúng phần màn hình còn lại; video co theo chiều cao, panel bên phải tự cuộn */
.ptm {
  display: flex;
  gap: 16px;
  height: var(--ptm-height, calc(100vh - 220px));
  min-height: 0;
}

/* Video lấp toàn bộ phần bên trái; lệch tỷ lệ thì có viền đen (object-fit: contain).
   aspect-ratio chỉ có tác dụng ở chế độ hẹp, khi chiều cao tự tính theo chiều rộng */
.ptm__video {
  flex: 7 1 0; /* 70% cho camera */
  min-width: 0;
  height: 100%;
  aspect-ratio: 16 / 9;
}
.ptm__stage {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #0f1424;
}
/* Bỏ khung trắng, dòng tên camera và tỷ lệ cố định của WebRTCPlayer để video lấp đầy khung */
.ptm__player {
  width: 100%;
  height: 100%;
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.ptm__player :deep(.flex-wrap.m-0) { display: none; }
.ptm__player :deep(.aspect-video) { height: 100%; aspect-ratio: auto; border: 0; border-radius: 0; }
.ptm__player :deep(.aspect-video > div) { height: 100%; }
.ptm__player :deep(video-stream) { display: block; width: 100%; height: 100%; }
.ptm__player :deep(video) { width: 100% !important; height: 100% !important; object-fit: contain !important; }
.ptm__hint {
  position: absolute;
  z-index: 25;
  left: 10px;
  bottom: 10px;
  max-width: calc(100% - 20px);
  margin: 0;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgb(20 25 38 / 85%);
  color: #cbd5e1;
  font-size: 12px;
}

.ptm__active-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  background: rgb(20 25 38 / 85%);
  color: #67c23a;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.ptm__dpad {
  position: absolute;
  z-index: 25;
  bottom: 10px;
  left: 10px;
  display: grid;
  width: 96px;
  height: 96px;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  align-items: center;
  justify-items: center;
  border-radius: 12px;
  background: rgb(47 52 69 / 92%);
  touch-action: none;
}
.ptm__dpad-center {
  display: grid;
  width: 28px;
  height: 28px;
  grid-area: 2 / 2;
  place-items: center;
  border-radius: 6px;
  background: #3970ad;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.ptm__direction {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  touch-action: none;
}
.ptm__direction .el-icon { font-size: 14px; transform: rotate(var(--direction-rotation)); }
.ptm__direction:hover,
.ptm__direction:active { background: #495166; }

/* Nằm giữa cạnh phải: tránh nhãn "RTC" của luồng (trên) và nút play/chụp/toàn màn hình (dưới) */
.ptm__zoom {
  position: absolute;
  z-index: 25;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: rgb(47 52 69 / 88%);
}
.ptm__zoom :deep(.el-button) { width: 32px; height: 32px; margin: 0; border: 0; background: transparent; color: #fff; }
.ptm__zoom :deep(.el-button:hover) { background: #495166; }

/* Quản lý */
/* 30% cho góc quay & tour, tối thiểu 380px để bảng không bị chật */
.ptm__manage { flex: 3 1 0; min-width: 380px; display: flex; flex-direction: column; gap: 12px; height: 100%; overflow-y: auto; }
.ptm__bar { flex-shrink: 0; }
/* Căn đáy: nút đồng bộ thẳng hàng với ô chọn camera (bên trái còn có nhãn phía trên) */
.ptm__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-extra-light);
}
.ptm__target { display: flex; align-items: center; gap: 7px; min-width: 0; color: var(--el-text-color-secondary); font-size: 12px; }
.ptm__target span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ptm__target .el-icon { flex-shrink: 0; color: var(--el-color-primary); }
.ptm__camera-select { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.ptm__camera-select label { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--el-text-color-secondary); }

.ptm__tabs :deep(.el-tabs__header) { margin-bottom: 10px; }
.ptm__tabs :deep(.el-tabs__item) { height: 44px; }
.ptm__tab-label { display: inline-flex; align-items: center; gap: 7px; }
.ptm__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 7px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 600;
}

.ptm__card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-bg-color);
  padding: 4px 12px 10px;
}
.ptm__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 2px; }
.ptm__title { font-weight: 650; font-size: 14px; }

.ptm__table { --el-table-header-bg-color: transparent; --el-table-tr-bg-color: transparent; --el-table-bg-color: transparent; font-size: 12px; }
.ptm__table :deep(th.el-table__cell) { color: var(--el-text-color-secondary); font-size: 11px; font-weight: 500; }
.ptm__table :deep(.el-table__inner-wrapper::before) { display: none; }
.ptm__table :deep(.cell) { padding-inline: 6px; }
.ptm__table--clickable :deep(.el-table__row) { cursor: pointer; }
.ptm__table :deep(.ptm__row--active) { --el-table-tr-bg-color: var(--el-color-primary-light-9); }

.ptm__number {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 600;
}
.ptm__preset-name { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 7px; font-weight: 600; }
.ptm__preset-name > span { overflow-wrap: anywhere; }
.ptm__goto { margin: 0; padding-inline: 8px; }
.ptm__icon-action { width: 26px; padding: 0; margin-left: 2px !important; }
.ptm__tour-name { font-weight: 600; }
.ptm__tour-route { margin-top: 3px; color: var(--el-text-color-secondary); font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }

/* Dialog */
.ptm__dialog-target {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  font-size: 13px;
}
.ptm__dialog-target strong { color: var(--el-color-primary); }
.ptm__alert { margin-bottom: 12px; }
.ptm__row { display: flex; gap: 8px; align-items: flex-start; width: 100%; }
.ptm__steps { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.ptm__grow { flex: 1; min-width: 0; }
.ptm__num { flex: none; width: 110px; }
.ptm__step-btn { width: 28px; margin: 0 !important; padding: 0; }
/* 3 nút lên/xuống/xoá: giữ chỗ để tiêu đề cột thẳng hàng với ô nhập */
.ptm__step-actions { flex: none; width: 84px; }
.ptm__step-legend { display: flex; gap: 8px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.3; }
:global(.ptm__dialog) { max-width: calc(100vw - 24px); }

.ptm--compact { flex-direction: column; height: auto; }
.ptm--compact .ptm__video { flex: none; width: 100%; height: auto; max-height: 55vh; }
.ptm--compact .ptm__manage { flex: none; min-width: 0; height: auto; overflow: visible; }
@media (max-width: 520px) {
  .ptm__bar { flex-direction: column; align-items: stretch; }
  .ptm__dpad { transform: scale(0.85); transform-origin: bottom left; }
}
</style>
