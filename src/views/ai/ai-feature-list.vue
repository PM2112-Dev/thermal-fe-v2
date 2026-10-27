<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { computed, onMounted, ref } from 'vue'
import { useLang } from '@/hooks/web/useI18n'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import DrawerForm from '@/components/Form/DrawerForm.vue'
import SearchButton from '@/components/Button/SearchButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import { TableColumn } from '@/components/Table'
import { localPagedFetch } from '@/utils/localPaging'
import { deleteAiFeatureApi, getAiFeaturesApi, getAiModelsApi } from '@/api/ai'
import AiFeatureForm from '@/views/ai/components/AiFeatureForm.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)

const elTableRef = ref<InstanceType<typeof ListTemplate>>()
const dialogVisible = ref(false)
const isEditing = ref(false)
const formModel = ref<Record<string, any>>({})

const models = ref<any[]>([])
onMounted(async () => {
  models.value = (await getAiModelsApi()).data ?? []
})

const columns = computed<TableColumn[]>(() => [
  { prop: 'code', label: t('ai.code'), width: 180, slots: { default: ({ row }) => <b>{row.code}</b> } },
  { prop: 'name', label: t('ai.name'), minWidth: 200 },
  {
    prop: 'modelName',
    label: t('ai.model'),
    minWidth: 180,
    slots: { default: ({ row }) => <span>{row.modelName ?? row.modelCode ?? '—'}</span> },
  },
  {
    prop: 'classes',
    label: t('ai.classes'),
    minWidth: 200,
    slots: {
      default: ({ row }) =>
        row.classes?.length ? (
          <div class="class-list">
            {row.classes.map((c: string) => (
              <span class="class-tag" key={c}>
                {c}
              </span>
            ))}
          </div>
        ) : (
          <span class="muted">{t('ai.allClasses')}</span>
        ),
    },
  },
  {
    prop: 'ruleType',
    label: t('ai.rule'),
    width: 190,
    slots: { default: ({ row }) => <span class="rule-badge">{row.ruleType}</span> },
  },
  { prop: 'cameraCount', label: t('ai.cameraCount'), width: 140, align: 'center' },
  {
    prop: 'enabled',
    label: t('ai.enabled'),
    width: 110,
    align: 'center',
    slots: {
      default: ({ row }) => (
        <span style={{ color: row.enabled ? 'var(--success)' : 'var(--danger)' }}>{row.enabled ? '●' : '○'}</span>
      ),
    },
  },
  {
    label: t('fields.action'),
    width: '140px',
    slots: {
      default: (scope: any) => (
        <div>
          {hasAction('ai-feature-list', 'update') && <EditCircleButton onClick={() => openDialogEdit(scope)} />}
          {scope.row.cameraCount === 0 && hasAction('ai-feature-list', 'delete') && <DeleteCircleButton onClick={() => openDelete(scope)} />}
        </div>
      ),
    },
  },
])

const openDialogAdd = () => {
  isEditing.value = false
  formModel.value = { enabled: true, ruleType: 'presence', classes: [], paramsText: '' }
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  isEditing.value = true
  const row = JSON.parse(JSON.stringify(scope.row))
  const hasParams = row.params && Object.keys(row.params).length > 0
  formModel.value = { ...row, paramsText: hasParams ? JSON.stringify(row.params, null, 2) : '' }
  dialogVisible.value = true
}
const openDelete = (scope: any) => {
  elTableRef.value?.deleteRow(deleteAiFeatureApi, scope.row.code)
}
const saveSuccess = () => {
  dialogVisible.value = false
  elTableRef.value?.refresh()
}
</script>

<template>
  <list-template
    :show-btn-add="hasAction('ai-feature-list', 'create')"
    ref="elTableRef"
    key-list="ai-feature-list"
    :title="t('ai.featureListTitle')"
    :columns="columns"
    :use-table-config="{ fetchDataApi: localPagedFetch(getAiFeaturesApi) }"
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
    <ai-feature-form :formModel="formModel" :models="models" :isEditing="isEditing" @success="saveSuccess"/>
  </drawer-form>
</template>

<style>
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
.muted {
  font-size: 12px;
  color: var(--text-sub);
}
.rule-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--purple);
  background: color-mix(in srgb, var(--purple) 12%, transparent);
}
</style>
