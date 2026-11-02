<template>
  <div class="ai-setting" v-loading="loading">
    <p class="ai-hint">{{ t('ai.cameraSettingHint') }}</p>
    <el-empty v-if="!loading && !options.length" :description="t('ai.noFeature')"/>
    <div class="ai-grid">
      <div
        v-for="item in options"
        :key="item.code"
        class="ai-card"
        :class="{ 'is-selected': item.isSelected, 'is-disabled': item.disabled }"
      >
        <div class="ai-card-head" @click="!item.disabled && (item.isSelected = !item.isSelected)">
          <el-checkbox v-model="item.isSelected" :disabled="item.disabled" @click.stop/>
          <div class="ai-card-title">
            <span class="ai-name">{{ item.name }}</span>
            <span v-if="item.ruleType" class="ai-rule">{{ item.ruleType }}</span>
          </div>
        </div>
        <div v-if="item.description" class="ai-desc">{{ item.description }}</div>

        <div v-if="item.isSelected && usesZones(item)" class="ai-params">
          <div class="ai-params-title">{{ t('ai.applyZones') }}</div>
          <el-select
            :model-value="item.params?.zoneIds ?? []"
            multiple
            clearable
            collapse-tags
            collapse-tags-tooltip
            size="small"
            style="width: 100%"
            :placeholder="t('ai.allZonesDefault')"
            @update:model-value="(v: number[]) => setParam(item, 'zoneIds', v.length ? v : undefined)"
          >
            <el-option v-for="z in zonesFor(item)" :key="z.id" :label="`${z.name} (${t(`ai.zoneKinds.${z.kind}`)})`" :value="z.id"/>
          </el-select>
          <div v-if="!zonesFor(item).length" class="ai-zone-empty">{{ t('ai.noZoneForRule') }}</div>
        </div>

        <div v-if="item.isSelected && paramKeys(item).length" class="ai-params">
          <div class="ai-params-title">{{ t('ai.customParams') }}</div>
          <div v-for="key in paramKeys(item)" :key="key" class="ai-param-row">
            <span class="ai-param-key">{{ key }}</span>
            <el-input-number
              v-if="typeof item.defaultParams?.[key] === 'number'"
              :model-value="item.params?.[key]"
              :controls="false"
              :placeholder="`${t('ai.defaultValue')}: ${item.defaultParams?.[key]}`"
              size="small"
              @update:model-value="(v: number | undefined) => setParam(item, key, v)"
            />
            <el-input
              v-else
              :model-value="item.params?.[key]"
              :placeholder="`${t('ai.defaultValue')}: ${stringify(item.defaultParams?.[key])}`"
              size="small"
              @update:model-value="(v: string) => setParam(item, key, v)"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="text-center mt-8">
      <save-button @click="saveForm" :loading="isLoading"></save-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import { onMounted, ref } from 'vue'
import SaveButton from '@/components/Button/SaveButton.vue'
import { getAiServicesApi, saveAiServicesApi } from '@/api/camera'
import { getAiZonesApi } from '@/api/ai'
import useRequest from '@/hooks/web/useRequest'
import { ElMessage } from 'element-plus'

const { t } = useLang()

interface Option {
  code: string
  name: string
  isSelected: boolean
  disabled?: boolean
  ruleType?: string
  description?: string
  defaultParams?: Record<string, any>
  params?: Record<string, any> | null
}

const props = defineProps<{
  camera: { id: number }
}>()

const options = ref<Option[]>([])
const loading = ref(false)
const zones = ref<any[]>([])

// Luật dựa trên vùng/đường kẻ mới cần chọn vùng; line_cross dùng đường kẻ, các luật còn lại dùng vùng đa giác
const ZONE_RULES = ['in_zone', 'zone_enter', 'zone_exit', 'line_cross', 'count', 'absence']
const usesZones = (item: Option) => ZONE_RULES.includes(item.ruleType ?? '')
const zonesFor = (item: Option) =>
  zones.value.filter((z) => (item.ruleType === 'line_cross' ? z.kind === 'line' : z.kind === 'polygon'))

onMounted(async () => {
  if (!props.camera?.id) return
  loading.value = true
  try {
    options.value = (await getAiServicesApi({ cameraId: props.camera.id })).data ?? []
    zones.value = (await getAiZonesApi(props.camera.id)).data ?? []
  } finally {
    loading.value = false
  }
})

// Chỉ cho sửa tham số đơn giản (số/chuỗi/bool); tham số dạng danh sách (vd. zoneIds) giữ nguyên
const paramKeys = (item: Option) =>
  Object.keys(item.defaultParams ?? {}).filter((k) => ['number', 'string'].includes(typeof item.defaultParams![k]))

const stringify = (v: unknown) => (typeof v === 'object' ? JSON.stringify(v) : String(v))

const setParam = (item: Option, key: string, value: unknown) => {
  const next = { ...(item.params ?? {}) }
  if (value === undefined || value === null || value === '') delete next[key]
  else next[key] = value
  item.params = next
}

// Gọi khi quay lại tab này sau khi vẽ vùng mới ở tab "Vùng giám sát"
const refreshZones = async () => {
  zones.value = (await getAiZonesApi(props.camera.id)).data ?? []
}
defineExpose({ refreshZones })

const emits = defineEmits(['saved'])
const { onRequest, isLoading } = useRequest()
const saveForm = () => {
  onRequest(saveAiServicesApi, {
    cameraId: props.camera.id,
    aiServices: options.value,
  }).then(() => {
    ElMessage({
      message: t('common.saveSuccess'),
      type: 'success',
    })
    emits('saved')
  })
}
</script>

<style scoped>
.ai-hint {
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-sub);
}
.ai-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.ai-card {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.ai-card.is-selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}
.ai-card.is-disabled {
  opacity: 0.6;
}
.ai-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.ai-card-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}
.ai-rule {
  align-self: flex-start;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--purple);
  background: color-mix(in srgb, var(--purple) 12%, transparent);
}
.ai-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-sub);
}
.ai-params {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
}
.ai-params-title {
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-sub);
}
.ai-zone-empty {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-sub);
}
.ai-param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.ai-param-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--text-main);
}
.ai-param-row :deep(.el-input-number),
.ai-param-row :deep(.el-input) {
  width: 55%;
}
</style>
