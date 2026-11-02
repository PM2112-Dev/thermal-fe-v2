<template>
  <div class="tour-manager">
    <div class="tour-toolbar">
      <el-button type="primary" @click="openAdd">{{ t('common.addNew') }}</el-button>
    </div>

    <el-empty v-if="!info.cameraTours?.length" :description="t('camera.tourEmpty')" />
    <div v-for="tour in info.cameraTours" :key="tour.tourId" class="tour-item">
      <div class="tour-head">
        <div class="tour-name">{{ tour.tourName }} <span class="tour-id">#{{ tour.tourId }}</span></div>
        <div class="tour-actions">
          <el-tooltip :content="t('camera.tourRun')">
            <el-button circle :icon="CaretRight" type="primary" @click="play(tour, 'run')" />
          </el-tooltip>
          <el-tooltip :content="t('camera.tourStop')">
            <el-button circle :icon="SwitchButton" type="warning" @click="play(tour, 'stop')" />
          </el-tooltip>
          <el-button circle :icon="EditPen" @click="openEdit(tour)" />
          <el-button circle :icon="Delete" type="danger" @click="remove(tour)" />
        </div>
      </div>
      <div class="tour-steps">
        <el-tag v-for="(s, i) in tour.cameraTourPresets" :key="i" class="m-1" effect="dark" type="success">
          {{ i + 1 }}. {{ s.name }} · {{ s.stayTime }}s<template v-if="s.speed != null"> · v{{ s.speed }}</template>
        </el-tag>
      </div>
    </div>

    <base-dialog v-model="visible" :width="isMobile ? '100%' : '640px'" :title="form.tourId ? t('common.update') : t('common.addNew')">
      <el-form label-position="top">
        <el-form-item :label="t('fields.name')">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="t('camera.tourSteps')">
          <div class="step-list">
            <div v-for="(s, i) in form.steps" :key="i" class="step-row">
              <span class="step-no">{{ i + 1 }}</span>
              <el-select v-model="s.presetId" :placeholder="t('camera.selectTourPoint')" class="step-preset" filterable>
                <el-option v-for="p in info.presets" :key="p.presetId" :label="`${p.name} (#${p.presetId})`" :value="p.presetId" />
              </el-select>
              <el-input-number v-model="s.stayTimeSeconds" :min="1" :max="3600" :controls="false" class="step-num"
                               :placeholder="t('camera.dwellTime')" />
              <el-input-number v-if="speed.supported" v-model="s.speed" :min="speed.min" :max="speed.max" :controls="false"
                               class="step-num" :placeholder="`${t('camera.tourSpeed')} ${speed.min}-${speed.max}`" />
              <el-button circle size="small" :icon="ArrowUp" :disabled="i === 0" @click="move(i, -1)" />
              <el-button circle size="small" :icon="ArrowDown" :disabled="i === form.steps.length - 1" @click="move(i, 1)" />
              <el-button circle size="small" type="danger" :icon="Delete" @click="form.steps.splice(i, 1)" />
            </div>
            <el-button @click="addStep">{{ t('camera.tourAddStep') }}</el-button>
          </div>
        </el-form-item>
        <div class="flex justify-center">
          <el-button type="primary" :loading="saving" :disabled="!canSave" @click="save">{{ t('common.save') }}</el-button>
        </div>
      </el-form>
    </base-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp, CaretRight, Delete, EditPen, SwitchButton } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import { useAppStore } from '@/store/modules/app'
import { getTourSpeedApi, playTourApi, removeTourApi, saveTourApi } from '@/api/camera'

const { t } = useLang()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)

const props = defineProps<{
  cameraId: string | number
  info: { presets?: any[]; cameraTours?: any[] }
  source: number
}>()
const emits = defineEmits<{ (e: 'update', info: any): void }>()

const visible = ref(false)
const saving = ref(false)
const speed = ref({ supported: false, min: 1, max: 7, default: 1 })
const form = reactive<{ tourId: number | null; name: string; steps: any[] }>({ tourId: null, name: '', steps: [] })

// Dải tốc độ do plugin của hãng khai báo; hãng không có tốc độ thì ẩn ô nhập
const loadSpeed = async () => {
  try {
    speed.value = (await getTourSpeedApi(props.cameraId, props.source)).data ?? speed.value
  } catch {
    speed.value = { ...speed.value, supported: false }
  }
}
onMounted(loadSpeed)
watch(() => props.source, loadSpeed)

const canSave = computed(
  () => form.name.trim().length > 0 && form.steps.length > 0 && form.steps.every((s) => s.presetId != null && s.stayTimeSeconds > 0),
)

const newStep = () => ({ presetId: null, stayTimeSeconds: 5, speed: speed.value.supported ? speed.value.default : null })
const addStep = () => form.steps.push(newStep())
const move = (i: number, d: number) => {
  const [item] = form.steps.splice(i, 1)
  form.steps.splice(i + d, 0, item)
}

const openAdd = () => {
  Object.assign(form, { tourId: null, name: '', steps: [newStep()] })
  visible.value = true
}
const openEdit = (tour: any) => {
  Object.assign(form, {
    tourId: tour.tourId,
    name: tour.tourName,
    steps: (tour.cameraTourPresets ?? []).map((s: any) => ({
      presetId: s.presetId,
      stayTimeSeconds: s.stayTime,
      speed: s.speed ?? (speed.value.supported ? speed.value.default : null),
    })),
  })
  visible.value = true
}

const save = async () => {
  saving.value = true
  try {
    const res = await saveTourApi(props.cameraId, {
      tourId: form.tourId,
      name: form.name.trim(),
      steps: form.steps.map((s) => ({
        presetId: s.presetId,
        stayTimeSeconds: s.stayTimeSeconds,
        speed: speed.value.supported ? s.speed ?? null : null,
      })),
      source: props.source,
    })
    emits('update', res.data)
    visible.value = false
    ElMessage.success(t('common.saveSuccess'))
  } finally {
    saving.value = false
  }
}

const remove = async (tour: any) => {
  await ElMessageBox.confirm(`${t('common.delWarning')} "${tour.tourName}"?`, t('common.notice'), { type: 'warning' })
  emits('update', (await removeTourApi(props.cameraId, tour.tourId, props.source)).data)
}

const play = async (tour: any, command: 'run' | 'stop') => {
  const res: any = await playTourApi({ tourId: tour.tourId, cameraId: props.cameraId, command })
  if (res.message) ElMessage.success(res.message)
}
</script>

<style scoped>
.tour-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.tour-item {
  padding: 12px 14px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}
.tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tour-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}
.tour-id {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-sub);
}
.tour-steps {
  margin-top: 8px;
}
.step-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.step-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.step-no {
  width: 18px;
  font-size: 12px;
  color: var(--text-sub);
}
.step-preset {
  flex: 1;
  min-width: 0;
}
.step-num {
  width: 90px;
}
</style>
