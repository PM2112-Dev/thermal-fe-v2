<template>
  <stream-control :stream-key="cameraId" :show-btn-back="false">
    <template #sidebar>
      <div class="preset-panel">
        <div class="panel-title">{{ t('camera.presetSaveCurrent') }}</div>
        <p class="panel-hint">{{ t('camera.presetSaveHint') }}</p>
        <el-input v-model="form.name" :placeholder="t('camera.presetName')" />
        <el-input-number
          v-model="form.presetId"
          :min="1"
          :controls="false"
          class="w-full"
          :placeholder="t('camera.presetNumberPlaceholder')"
        />
        <div class="panel-actions">
          <el-button type="primary" :loading="saving" :disabled="!form.name.trim()" @click="save">
            {{ t('camera.presetSave') }}
          </el-button>
          <el-button :loading="syncing" @click="sync">{{ t('camera.syncPresets') }}</el-button>
        </div>

        <el-empty v-if="!info.presets?.length" :description="t('camera.presetEmpty')" :image-size="50" />
        <div v-for="p in info.presets" :key="p.id" class="preset-item">
          <div class="preset-body">
            <div class="preset-name">{{ p.name }}</div>
            <div class="preset-sub">#{{ p.presetId }} · {{ p.presetTypeObject?.name }}</div>
          </div>
          <el-tooltip :content="t('camera.presetGo')">
            <el-button circle size="small" :icon="Aim" :loading="goingId === p.presetId" @click="go(p)" />
          </el-tooltip>
          <el-tooltip :content="t('common.delWarning')">
            <el-button circle size="small" type="danger" :icon="Delete" @click="remove(p)" />
          </el-tooltip>
        </div>
      </div>
    </template>
  </stream-control>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Aim, Delete } from '@element-plus/icons-vue'
import { useLang } from '@/hooks/web/useI18n'
import StreamControl from '@/components/Video/StreamControl.vue'
import { invokePresetApi, removePresetApi, savePresetApi, syncPresetsApi } from '@/api/camera'

const { t } = useLang()

const props = defineProps<{
  cameraId: string | number
  info: { presets?: any[]; cameraTours?: any[] }
  source: number
}>()
const emits = defineEmits<{ (e: 'update', info: any): void }>()

const form = reactive<{ name: string; presetId: number | undefined }>({ name: '', presetId: undefined })
const saving = ref(false)
const syncing = ref(false)
const goingId = ref<number | null>(null)

// Camera tự ghi vị trí PTZ hiện tại; trùng số preset đã có = ghi đè. Backend đồng bộ lại rồi trả danh sách mới.
const save = async () => {
  saving.value = true
  try {
    const res = await savePresetApi(props.cameraId, {
      name: form.name.trim(),
      presetId: form.presetId ?? null,
      source: props.source,
    })
    emits('update', res.data)
    ElMessage.success(t('common.saveSuccess'))
    form.name = ''
    form.presetId = undefined
  } finally {
    saving.value = false
  }
}

const sync = async () => {
  syncing.value = true
  try {
    emits('update', (await syncPresetsApi(props.cameraId)).data)
  } finally {
    syncing.value = false
  }
}

const go = async (p: any) => {
  goingId.value = p.presetId
  try {
    await invokePresetApi({ cameraId: props.cameraId, presetId: p.presetId })
  } finally {
    goingId.value = null
  }
}

const remove = async (p: any) => {
  await ElMessageBox.confirm(`${t('common.delWarning')} "${p.name}"?`, t('common.notice'), { type: 'warning' })
  const res = await removePresetApi(props.cameraId, p.presetId, props.source)
  emits('update', res.data)
}
</script>

<style scoped>
.preset-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}
.panel-hint {
  font-size: 12px;
  color: var(--text-sub);
}
.panel-actions {
  display: flex;
  gap: 8px;
}
.preset-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.preset-body {
  flex: 1;
  min-width: 0;
}
.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}
.preset-sub {
  font-size: 11px;
  color: var(--text-sub);
}
</style>
