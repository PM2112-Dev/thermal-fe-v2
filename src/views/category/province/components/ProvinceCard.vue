<template>
  <div class="sensor-card-item">
    <div class="sc-header">
      <div class="sc-id">{{ row.code }}</div>
    </div>
    <div class="sc-name">{{ row.name }}</div>
    <div class="sc-actions">
      <button class="action-btn-circle btn-edit-round" @click="() => $emit('edit', { row: row })">✎</button>
      <button class="action-btn-circle btn-delete-round" @click="() => $emit('delete', { row: row })">🗑</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TableColumn } from '@/components/Table/TableCard.vue'

type RowData = any
defineProps<{
  row: RowData
  columns: TableColumn[]
  index: number
  loading: boolean
}>()
</script>
