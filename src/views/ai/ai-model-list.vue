<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { computed, ref } from 'vue'
import { useLang } from '@/hooks/web/useI18n'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import DrawerForm from '@/components/Form/DrawerForm.vue'
import SearchButton from '@/components/Button/SearchButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import { TableColumn } from '@/components/Table'
import { STATUS_ACTIVE } from '@/constants'
import { enumLabel } from '@/utils/enumLabel'
import { localPagedFetch } from '@/utils/localPaging'
import { deleteAiModelApi, getAiModelsApi } from '@/api/ai'
import AiModelForm from '@/views/ai/components/AiModelForm.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)

const elTableRef = ref<InstanceType<typeof ListTemplate>>()
const dialogVisible = ref(false)
const formModel = ref<Record<string, any>>({})

const columns = computed<TableColumn[]>(() => [
  { prop: 'code', label: t('ai.code'), width: 170, slots: { default: ({ row }) => <b>{row.code}</b> } },
  { prop: 'name', label: t('ai.name'), minWidth: 200 },
  {
    prop: 'taskType',
    label: t('ai.taskType'),
    width: 150,
    slots: {
      default: ({ row }) => (
        <span class={['task-badge', row.taskType === 'segment' ? 'is-segment' : 'is-detect']}>
          {row.taskType === 'segment' ? t('ai.taskSegment') : t('ai.taskDetect')}
        </span>
      ),
    },
  },
  {
    prop: 'classes',
    label: t('ai.classes'),
    minWidth: 240,
    slots: {
      default: ({ row }) => (
        <div class="class-list">
          {(row.classes ?? []).map((c: string) => (
            <span class="class-tag" key={c}>
              {c}
            </span>
          ))}
        </div>
      ),
    },
  },
  {
    prop: 'confidence',
    label: t('ai.confidence'),
    width: 120,
    align: 'center',
    slots: { default: ({ row }) => <span>{Math.round((row.confidence ?? 0) * 100)}%</span> },
  },
  { prop: 'featureCount', label: t('ai.featureCount'), width: 110, align: 'center' },
  {
    prop: 'displayStatus',
    width: 130,
    label: t('fields.status'),
    slots: {
      default: ({ row }) => (
        <span style={{ color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)' }}>
          {enumLabel('commonStatusList', row.status, row.displayStatus)}
        </span>
      ),
    },
  },
  {
    label: t('fields.action'),
    width: '140px',
    slots: {
      default: (scope: any) => (
        <div>
          {hasAction('ai-model-list', 'update') && <EditCircleButton onClick={() => openDialogEdit(scope)} />}
          {scope.row.featureCount === 0 && hasAction('ai-model-list', 'delete') && <DeleteCircleButton onClick={() => openDelete(scope)} />}
        </div>
      ),
    },
  },
])

const openDialogAdd = () => {
  formModel.value = { status: STATUS_ACTIVE, taskType: 'detect', confidence: 0.4, classes: [] }
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}
const openDelete = (scope: any) => {
  elTableRef.value?.deleteRow(deleteAiModelApi, scope.row.id)
}
const saveSuccess = () => {
  dialogVisible.value = false
  elTableRef.value?.refresh()
}
</script>

<template>
  <list-template
    :show-btn-add="hasAction('ai-model-list', 'create')"
    ref="elTableRef"
    key-list="ai-model-list"
    :title="t('ai.modelListTitle')"
    :columns="columns"
    :use-table-config="{ fetchDataApi: localPagedFetch(getAiModelsApi) }"
    :search-props="{ className: '' }"
    @addHandler="openDialogAdd"
    @edit="openDialogEdit"
    @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams, tableMethods }">
      <div class="filter-row">
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.name') }}</div>
          <el-input v-model="searchParams.keyword" class="filter-input" clearable
                    :placeholder="t('ai.searchPlaceholder')" @keyup.enter="tableMethods.getList"/>
        </div>
        <search-button @click="tableMethods.getList"></search-button>
      </div>
    </template>
  </list-template>
  <drawer-form v-model="dialogVisible" :size="isMobile ? '100%' : '560px'" :show-close="true">
    <ai-model-form :formModel="formModel" @success="saveSuccess"/>
  </drawer-form>
</template>

<style>
.task-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.task-badge.is-detect {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.task-badge.is-segment {
  color: var(--purple);
  background: color-mix(in srgb, var(--purple) 12%, transparent);
}
.class-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.class-tag {
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-sub);
  background: var(--bg-body);
  border: 1px solid var(--border);
}
</style>
