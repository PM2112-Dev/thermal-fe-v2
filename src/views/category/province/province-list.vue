<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import { TableColumn } from '@/components/Table'
import { useLang } from '@/hooks/web/useI18n'
import { computed, ref } from 'vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import ProvinceForm from '@/views/category/province/components/ProvinceForm.vue'
import ProvinceCard from '@/views/category/province/components/ProvinceCard.vue'
import { deleteProvinceApi, getProvinceListApi } from '@/api/province'
import SearchButton from '@/components/Button/SearchButton.vue'
import DrawerForm from '@/components/Form/DrawerForm.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()

const columns = computed<TableColumn[]>(() => [
  { prop: 'code', label: t('province.code') },
  { prop: 'name', label: t('province.name') },
  {
    label: t('fields.action'),
    width: '160px',
    slots: {
      default: (scope: any) => (
        <div>
          {hasAction('province', 'update') && <EditCircleButton onClick={() => openDialogEdit(scope)}></EditCircleButton>}
          {hasAction('province', 'delete') && <DeleteCircleButton onClick={() => openDelete(scope)}></DeleteCircleButton>}
        </div>
      ),
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()
const formModel = ref({})

const openDialogAdd = () => {
  formModel.value = {}
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}
const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteProvinceApi, scope.row.id)
}
const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}

const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <list-template
    :show-btn-add="hasAction('province', 'create')"
    :title="t('province.listTitle')"
    ref="elTableRef"
    key-list="province-list"
    :columns="columns"
    :use-table-config="{
      fetchDataApi: getProvinceListApi,
    }"
    @addHandler="openDialogAdd"
    :search-props="{
      className: '',
    }"
    :card-component="ProvinceCard"
    @edit="openDialogEdit"
    @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams, tableMethods }">
      <div class="filter-row">
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.name') }}</div>
          <el-input v-model="searchParams.name" class="filter-input" :placeholder="t('province.namePlaceholder')" clearable />
        </div>
        <search-button @click="tableMethods.getList"></search-button>
      </div>
    </template>
  </list-template>
  <drawer-form v-model="dialogVisible" :size="isMobile ? '100%' : '50%'" :show-close="true">
    <ProvinceForm :formModel="formModel" @success="saveSuccess"></ProvinceForm>
  </drawer-form>
</template>

<style lang="scss" scoped></style>
