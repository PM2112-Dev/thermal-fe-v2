<template>
  <div class="sensor-card-item">
    <div class="sc-header">
      <span class="sc-id">{{ row?.code }}</span>
      <span :style="{color: row?.status === 'Active' ? 'var(--success)' : 'var(--danger)', fontSize: '12px'}">
        ● {{ enumLabel('commonStatusList', row?.status, row?.displayStatus) }}
      </span>
    </div>
    <div class="sc-name">{{ row?.name }}</div>
    <div class="sc-info">
      <div class="sc-info-item">
        <span :class="['task-badge', row?.taskType === 'segment' ? 'is-segment' : 'is-detect']">
          {{ row?.taskType === 'segment' ? t('ai.taskSegment') : t('ai.taskDetect') }}
        </span>
      </div>
      <div class="sc-info-item">
        <div class="class-list">
          <span v-for="c in row?.classes ?? []" :key="c" class="class-tag">{{ c }}</span>
        </div>
      </div>
      <div class="sc-info-item">🎯 {{ t('ai.confidence') }}: {{ Math.round((row?.confidence ?? 0) * 100) }}%</div>
      <div class="sc-info-item">⚙️ {{ t('ai.featureCount') }}: {{ row?.featureCount ?? 0 }}</div>
    </div>
    <div class="sc-actions">
      <div class="action-group">
        <button v-if="hasAction('ai-model-list', 'update')" class="action-btn-circle btn-blue" :title="t('common.edit')"
                @click="() => emits('edit', {row: row})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button v-if="row?.featureCount === 0 && hasAction('ai-model-list', 'delete')" class="action-btn-circle btn-red"
                :title="t('common.delOk')" @click="() => emits('delete', {row: row})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import type {TableColumn} from '@/components/Table/TableCard.vue'

const { t } = useLang()
const { hasAction } = usePermission()

type RowData = any
defineProps<{
  row: RowData
  columns: TableColumn[]
  index: number
  loading: boolean
}>()

const emits = defineEmits(['edit', 'delete'])
</script>
