<template>
  <div v-loading="loading" class="panel">
    <el-alert v-if="state && !state.supported" type="info" :closable="false" show-icon
              :title="t('camera.alarmUnsupported')"/>
    <div v-else-if="state" class="alarm-grid">
      <div v-for="item in items" :key="item.key" class="alarm-card" :class="{ 'is-on': item.value }">
        <div class="alarm-icon">{{ item.icon }}</div>
        <div class="alarm-body">
          <div class="alarm-title">{{ item.label }}</div>
          <div class="alarm-sub" v-if="item.value == null">{{ t('camera.alarmNotAvailable') }}</div>
        </div>
        <el-switch
          :model-value="!!item.value"
          :disabled="item.value == null"
          :loading="saving === item.key"
          @change="(v: boolean) => toggle(item.key, v)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import { getCameraFireAlarmApi, saveCameraFireAlarmApi } from '@/api/camera'

const { t } = useLang()
const props = defineProps<{ camera: { id: number } }>()

const loading = ref(false)
const saving = ref<string | null>(null)
const state = ref<any>(null)

const items = computed(() => [
  { key: 'fire', icon: '🔥', label: t('camera.fireAlarm'), value: state.value?.fire },
  { key: 'smoke', icon: '💨', label: t('camera.smokeAlarm'), value: state.value?.smoke },
])

const load = async () => {
  loading.value = true
  try {
    state.value = (await getCameraFireAlarmApi(props.camera.id)).data
  } finally {
    loading.value = false
  }
}
onMounted(load)

const toggle = async (key: string, value: boolean) => {
  saving.value = key
  try {
    state.value = (await saveCameraFireAlarmApi(props.camera.id, { [key]: value })).data
    ElMessage.success(t('common.saveSuccess'))
  } finally {
    saving.value = null
  }
}
</script>

<style scoped>
.panel {
  padding: 4px 2px 16px;
}
.alarm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}
.alarm-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.alarm-card.is-on {
  border-color: var(--warning);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 15%, transparent);
}
.alarm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  font-size: 22px;
  background: var(--bg-body);
}
.alarm-body {
  flex: 1;
}
.alarm-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}
.alarm-sub {
  font-size: 12px;
  color: var(--text-sub);
}
</style>
