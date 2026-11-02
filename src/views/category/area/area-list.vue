<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import { TableColumn } from '@/components/Table'
import { useLang } from '@/hooks/web/useI18n'
import { deleteAreaApi, getAreaListApi } from '@/api/area'
import { computed, ref } from 'vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import AreaForm from '@/views/category/area/components/AreaForm.vue'
import { STATUS_ACTIVE } from '@/constants'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import SearchButton from "@/components/Button/SearchButton.vue";
import DrawerForm from "@/components/Form/DrawerForm.vue";
import AreaCard from '@/views/category/area/components/AreaCard.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()
const renderActionColumn = (scope: any) => {
  return (
    <div>
      <EditCircleButton onClick={() => openDialogEdit(scope)}></EditCircleButton>
      <DeleteCircleButton onClick={() => openDelete(scope)}></DeleteCircleButton>
    </div>
  )
}
const columns = computed<TableColumn[]>(() => [
  { prop: 'code', label: t('area.code') },
  { prop: 'name', label: t('area.name') },
  { prop: 'mapTypeObject.name', label: t('area.mapType') },
  { prop: 'note', label: t('fields.note') },
  {
    prop: 'displayStatus',
    width: 140,
    label: t('fields.status'),
    slots: {
      default: ({row}) => (<span   style={{
        color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)'
      }}>{enumLabel('commonStatusList', row.status, row.displayStatus)}</span>)
    },
  },
  {
    label: t('fields.action'),
    width: '110px',
    slots: {
      default: renderActionColumn,
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()

const formModel = ref<any>({})

const openDialogAdd = () => {
  formModel.value = {
    mapType: 'Map',
    parentId: null,
    status: STATUS_ACTIVE,
  }
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}

const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteAreaApi, scope.row.id)
}

const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}
const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <list-template
      :show-btn-add="hasAction('area', 'create')"
      ref="elTableRef"
      :title="t('area.listTitle')"
      key-list="area-list"
      :columns="columns"
      :card-component="AreaCard"
      :use-table-config="{
        fetchDataApi: getAreaListApi,
      }"
      :row-key="(row: any) => row.id"
      :default-expand-all="false"
      @addHandler="openDialogAdd"
      :tree-props="{ children: 'children', checkStrictly: true }"
      @edit="openDialogEdit"
      @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams, tableMethods }">
      <div class="filter-item">
        <div class="filter-label">{{ t('area.name') }}</div>
        <el-input class="filter-input" v-model="searchParams.name" clearable :placeholder="t('area.namePlaceholder')" />
      </div>
      <div class="filter-item">
        <div class="filter-label">{{ t('fields.status') }}</div>
        <select-from-config
            class="filter-input"
            key-config="userStatusList"
            v-model="searchParams.status"
            clearable
        ></select-from-config>
      </div>
      <search-button @click="tableMethods.getList"></search-button>
    </template>
  </list-template>
  <drawer-form
      v-model="dialogVisible"
      :destroy-on-close="true"
      :size="isMobile? '100%': '50%'"
  >
    <area-form
      v-model:formModel="formModel"
      @success="saveSuccess"
      :title="formModel.id ? t('area.edit') : t('area.add')"
    ></area-form>
  </drawer-form>
</template>
