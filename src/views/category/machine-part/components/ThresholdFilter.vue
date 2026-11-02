<script setup lang="ts">
import { enumLabel } from '@/utils/enumLabel'
import { useLang } from '@/hooks/web/useI18n'
import {computed} from 'vue'

const { t } = useLang()

interface Option {
  id: string
  code?: string
  name: string
}

const props = defineProps<{
  modelValue: Option[]
  options: Option[]
}>()

const emit = defineEmits(['update:modelValue', 'change'])

// 👉 convert qua lại giữa object <-> id
const selectedIds = computed<string[]>({
  get: () => props.modelValue.map(i => i.id),
  set: (ids: string[]) => {
    const selected = props.options.filter(o => ids.includes(o.id))
    emit('update:modelValue', selected)
    emit('change', selected)
  }
})

// select all
const isAllSelected = computed(() => {
  return selectedIds.value.length === props.options.length
})

const toggleAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = props.options.map(o => o.id)
  }
}
</script>

<template>
  <el-dropdown trigger="click">
    <!-- Button -->
    <span class="el-dropdown-link cursor-pointer">
      <el-button size="small" plain class="threshold-filter-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>{{ t('machinePart.thresholdTypeShort') }}</span>
        <span class="threshold-filter-count">{{ selectedIds.length }}/{{ options.length }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </el-button>
    </span>

    <!-- Dropdown -->
    <template #dropdown>
      <div class="p-3 w-[260px]">
        <!-- Header -->
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold text-sm">{{ t('machinePart.thresholdTypeShort') }}</span>
          <el-link type="primary" @click="toggleAll" :underline="false">
            {{ isAllSelected ? t('common.deselectAll') : t('common.selectAll') }}
          </el-link>
        </div>

        <!-- Checkbox group -->
        <el-checkbox-group v-model="selectedIds" class="flex flex-col gap-2">
          <el-checkbox
              v-for="item in options"
              :key="item.id"
              :label="item.id"
          >
            {{ enumLabel('thresholdTypeList', item.code, item.name) }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </template>
  </el-dropdown>
</template>

<style scoped>
.threshold-filter-btn > :deep(span) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.threshold-filter-count {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 15%, transparent);
}
</style>
