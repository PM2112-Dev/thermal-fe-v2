<template>
  <div class="sensor-card-item">
    <div class="sc-header"><span class="sc-id">{{ row?.code }}</span>
      <span
          :style="{color: row.deviceStatusObject.code === 'On' ? 'var(--success)' : 'var(--danger)', fontSize: '12px'}">● {{ enumLabel('deviceStatusList', row?.deviceStatusObject?.code, row?.deviceStatusObject?.name) }}</span>
    </div>
    <div class="sc-name text-blue-600 hover:underline cursor-pointer" @click="()=>$emit('redirectDetail', row)">{{ row?.name }}</div>
    <div class="sc-info">
      <div class="sc-info-item">📍 {{ row?.area?.name }}</div>
      <div class="sc-info-item">🎥 {{ row?.cameraTypeObject?.name }}</div>
    </div>
    <div class="sc-actions">
      <div class="action-group">
        <button class="action-btn-circle btn-gray-outline" :title="t('camera.sync')" @click="() => emits('syncPresets', row)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
        <button class="action-btn-circle btn-gray-outline" :title="t('camera.viewPresets')"
                @click="() => emits('showPresets', row)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="5 9 2 12 5 15"></polyline>
            <polyline points="9 5 12 2 15 5"></polyline>
            <polyline points="15 19 12 22 9 19"></polyline>
            <polyline points="19 9 22 12 19 15"></polyline>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="12" y1="2" x2="12" y2="22"></line>
          </svg>
        </button>
        <button v-if="row.cameraType === CAMERA_NORMAL_TYPE" class="action-btn-circle btn-gray-outline"
                :title="t('camera.adjustPresets')" @click="() => emits('showVisionPresets', row)">
          <el-icon>
            <Aim/>
          </el-icon>
        </button>
        <button class="action-btn-circle btn-gray-outline" :title="t('camera.presetSettings')"
                @click="() => emits('showPresetSetting', row)">
          <el-icon>
            <Pointer/>
          </el-icon>
        </button>
        <button class="action-btn-circle btn-blue" :title="t('common.edit')" @click="() => emits('edit', {row:row})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn-circle btn-red" :title="t('common.delOk')" @click="() => emits('delete', {row:row})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
            </path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
        <button v-if="hasAiManagement()" class="action-btn-circle btn-gray-outline" :title="t('camera.aiSettings')"
                @click="() => emits('showAISetting', row)">
          <el-icon>
            <Notification/>
          </el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import { useLang } from '@/hooks/web/useI18n'
import type {TableColumn} from '@/components/Table/TableCard.vue'
import {CAMERA_NORMAL_TYPE} from '@/constants'
import {Aim, Notification, Pointer} from '@element-plus/icons-vue'

const { t } = useLang()

type RowData = any
defineProps<{
  row: RowData
  columns: TableColumn[]
  index: number
  loading: boolean
}>()

const { hasAiManagement } = usePermission()

const emits = defineEmits(['edit', 'delete', 'syncPresets', 'showPresets', 'showVisionPresets', 'showPresetSetting', 'showAISetting', 'redirectDetail'])

</script>