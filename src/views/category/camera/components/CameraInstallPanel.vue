<template>
  <div class="panel">
    <div class="panel-section" v-loading="loadingDirection">
      <div class="section-title">{{ t('camera.currentDirection') }}</div>
      <div v-if="direction" class="compass-row">
        <div class="compass">
          <div class="compass-needle" :style="{ transform: `rotate(${direction.headingDegrees}deg)` }"/>
          <span class="compass-n">N</span>
        </div>
        <div class="compass-text">
          <div class="compass-value">{{ Math.round(direction.headingDegrees) }}°</div>
          <div class="compass-name">{{ direction.directionName }} ({{ direction.direction }})</div>
          <div class="hint">Pan: {{ direction.currentPan }}</div>
        </div>
      </div>
      <el-form label-position="top" class="mt-3">
        <el-row :gutter="16">
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.heading')">
              <el-input-number v-model="headingForm.heading" :min="0" :max="360" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.panInverted')">
              <el-switch v-model="headingForm.panInverted"/>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="hint">{{ t('camera.headingHint') }}</div>
      </el-form>
      <div class="actions">
        <el-button type="primary" :loading="savingDirection" :disabled="headingForm.heading == null"
                   @click="saveDirection">{{ t('camera.saveDirection') }}</el-button>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-title">{{ t('camera.installParams') }}</div>
      <el-form label-position="top">
        <el-row :gutter="16">
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.installHeight')">
              <el-input-number v-model="install.installHeight" :min="0" :max="1000" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.horizontalFov')">
              <el-input-number v-model="install.horizontalFov" :min="1" :max="179" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.focalLength')">
              <el-input-number v-model="install.focalLength35mm" :min="1" :max="2000" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.installPitch')">
              <el-input-number v-model="install.installPitch" :min="-90" :max="90" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.installRoll')">
              <el-input-number v-model="install.installRoll" :min="-45" :max="45" :controls="false" class="!w-full"/>
            </el-form-item>
          </el-col>
          <el-col :span="isMobile ? 24 : 12">
            <el-form-item :label="t('camera.aiStream')">
              <el-switch v-model="install.aiStreamEnabled"/>
              <div class="hint">{{ t('camera.aiStreamHint') }}</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div class="actions">
        <save-button :loading="savingInstall" @click="saveInstall"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import SaveButton from '@/components/Button/SaveButton.vue'
import { editCameraApi, getCameraDirectionApi, saveCameraDirectionApi } from '@/api/camera'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)
// formModel là CameraDto đầy đủ: thông số lắp đặt lưu qua PUT camera nên phải gửi lại cả đối tượng
const props = defineProps<{ formModel: Record<string, any> }>()
const emit = defineEmits<(e: 'success') => void>()

const direction = ref<any>(null)
const loadingDirection = ref(false)
const savingDirection = ref(false)
const savingInstall = ref(false)
const headingForm = reactive<{ heading: number | null; panInverted: boolean }>({
  heading: null,
  panInverted: !!props.formModel.panInverted,
})
const install = reactive({
  installHeight: props.formModel.installHeight ?? null,
  horizontalFov: props.formModel.horizontalFov ?? null,
  focalLength35mm: props.formModel.focalLength35mm ?? null,
  installPitch: props.formModel.installPitch ?? null,
  installRoll: props.formModel.installRoll ?? null,
  aiStreamEnabled: !!props.formModel.aiStreamEnabled,
})

const loadDirection = async () => {
  loadingDirection.value = true
  try {
    direction.value = (await getCameraDirectionApi(props.formModel.id)).data
    headingForm.heading = Math.round(direction.value.headingDegrees)
    headingForm.panInverted = !!direction.value.panInverted
  } catch {
    // Chưa cấu hình mốc hướng / hãng không hỗ trợ: để người dùng nhập lần đầu
    direction.value = null
  } finally {
    loadingDirection.value = false
  }
}
onMounted(loadDirection)

const saveDirection = async () => {
  savingDirection.value = true
  try {
    await saveCameraDirectionApi(props.formModel.id, {
      heading: headingForm.heading as number,
      panInverted: headingForm.panInverted,
    })
    ElMessage.success(t('common.saveSuccess'))
    await loadDirection()
  } finally {
    savingDirection.value = false
  }
}

const saveInstall = async () => {
  savingInstall.value = true
  try {
    await editCameraApi(props.formModel.id, { ...props.formModel, ...install })
    Object.assign(props.formModel, install)
    ElMessage.success(t('common.saveSuccess'))
    emit('success')
  } finally {
    savingInstall.value = false
  }
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 2px 16px;
}
.panel-section {
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}
.section-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
}
.hint {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-sub);
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.compass-row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.compass {
  position: relative;
  width: 84px;
  height: 84px;
  flex: none;
  border: 2px solid var(--border);
  border-radius: 50%;
  background: var(--bg-body);
}
.compass-n {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: var(--danger);
}
.compass-needle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 56px;
  margin: -28px 0 0 -2px;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--primary) 50%, var(--border) 50%);
  transition: transform 0.4s ease;
}
.compass-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-main);
}
.compass-name {
  font-size: 13px;
  color: var(--text-sub);
}
</style>
