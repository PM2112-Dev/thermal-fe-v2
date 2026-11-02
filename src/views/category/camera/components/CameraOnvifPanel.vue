<template>
  <div v-loading="loading" class="panel">
    <div class="panel-section">
      <div class="section-title">{{ t('camera.onvifMode') }}</div>
      <el-radio-group v-model="settings.mode">
        <el-radio-button :value="0">{{ t('camera.onvifModeAuto') }}</el-radio-button>
        <el-radio-button :value="1">{{ t('camera.onvifModeOn') }}</el-radio-button>
        <el-radio-button :value="2">{{ t('camera.onvifModeOff') }}</el-radio-button>
      </el-radio-group>
      <el-form label-position="top" class="mt-4">
        <el-form-item :label="t('camera.onvifPort')">
          <el-input-number v-model="settings.port" :min="1" :max="65535" :controls="false" class="!w-full"/>
          <div class="hint">{{ t('camera.onvifPortHint') }}</div>
        </el-form-item>
      </el-form>
      <div class="actions">
        <el-button :loading="checking" @click="check">{{ t('camera.checkOnvif') }}</el-button>
        <save-button :loading="saving" @click="saveSettings"/>
      </div>
    </div>

    <div class="status-grid" v-if="info">
      <div class="status-item">
        <span class="status-label">{{ t('camera.onvifDetected') }}</span>
        <span :class="['pill', detectedClass]">{{ detectedText }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('camera.onvifActive') }}</span>
        <span :class="['pill', info.active ? 'ok' : 'off']">{{ info.active ? t('camera.onvifActiveYes') : t('camera.onvifActiveNo') }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('camera.profileToken') }}</span>
        <span class="mono">{{ info.profileToken || '—' }}</span>
      </div>
    </div>

    <div class="panel-section" v-if="info">
      <div class="section-title">{{ t('camera.onvifDevice') }}</div>
      <el-alert v-if="!info.deviceConfigSupported" type="info" :closable="false" show-icon
                :title="t('camera.onvifDeviceUnsupported')"/>
      <template v-else>
        <el-alert v-if="info.deviceError" class="mb-3" type="warning" :closable="false" show-icon
                  :title="info.deviceError"/>
        <el-form label-position="left" label-width="200px">
          <el-form-item :label="t('camera.onvifEnabled')">
            <el-switch v-model="device.enabled"/>
          </el-form-item>
          <el-form-item :label="t('camera.onvifLoginRequired')">
            <el-switch v-model="device.loginRequired"/>
          </el-form-item>
          <el-form-item :label="t('camera.onvifPassword')">
            <el-input v-model="device.password" type="password" show-password autocomplete="new-password"/>
          </el-form-item>
        </el-form>
        <div class="actions">
          <save-button :loading="savingDevice" @click="saveDevice"/>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import SaveButton from '@/components/Button/SaveButton.vue'
import {
  checkCameraOnvifApi,
  getCameraOnvifApi,
  saveCameraOnvifDeviceApi,
  saveCameraOnvifSettingsApi,
} from '@/api/camera-onvif'

const { t } = useLang()
const props = defineProps<{ camera: { id: number } }>()

const loading = ref(false)
const checking = ref(false)
const saving = ref(false)
const savingDevice = ref(false)
const info = ref<any>(null)
const settings = reactive<{ mode: number; port: number | null }>({ mode: 0, port: null })
const device = reactive<{ enabled: boolean; loginRequired: boolean; password: string }>({
  enabled: false,
  loginRequired: false,
  password: '',
})

const apply = (data: any) => {
  info.value = data
  settings.mode = data?.mode ?? 0
  settings.port = data?.port ?? null
  device.enabled = !!data?.device?.enabled
  device.loginRequired = !!data?.device?.loginRequired
  device.password = ''
}

const load = async () => {
  loading.value = true
  try {
    apply((await getCameraOnvifApi(props.camera.id)).data)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const detectedText = computed(() =>
  info.value?.detected == null
    ? t('camera.onvifNotChecked')
    : info.value.detected
      ? t('camera.onvifDetectedYes')
      : t('camera.onvifDetectedNo'),
)
const detectedClass = computed(() => (info.value?.detected == null ? 'off' : info.value.detected ? 'ok' : 'bad'))

const saveSettings = async () => {
  saving.value = true
  try {
    apply((await saveCameraOnvifSettingsApi(props.camera.id, { mode: settings.mode, port: settings.port })).data)
    ElMessage.success(t('common.saveSuccess'))
  } finally {
    saving.value = false
  }
}

const check = async () => {
  checking.value = true
  try {
    apply((await checkCameraOnvifApi(props.camera.id)).data)
  } finally {
    checking.value = false
  }
}

const saveDevice = async () => {
  savingDevice.value = true
  try {
    const body: Record<string, any> = { enabled: device.enabled, loginRequired: device.loginRequired }
    if (device.password) body.password = device.password
    apply((await saveCameraOnvifDeviceApi(props.camera.id, body)).data)
    ElMessage.success(t('common.saveSuccess'))
  } finally {
    savingDevice.value = false
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
  gap: 10px;
  margin-top: 8px;
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.status-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
}
.status-label {
  font-size: 12px;
  color: var(--text-sub);
}
.pill {
  align-self: flex-start;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.pill.ok {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 12%, transparent);
}
.pill.bad {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}
.pill.off {
  color: var(--text-sub);
  background: var(--bg-body);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>
