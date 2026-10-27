<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import {TableColumn} from '@/components/Table'
import {useLang} from '@/hooks/web/useI18n'
import {computed, ref} from 'vue'
import {STATUS_ACTIVE} from '@/constants'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import {
  deleteMachineApi,
  detailMachineApi,
  exportMachineIECApi,
  exportMonitorPointsApi,
  getMachineListApi, importIECApi
} from '@/api/machine'
import {getAllTreeAreaApi} from '@/api/area'
import MachineForm from '@/views/category/machine/components/MachineForm.vue'
import TreeSelectRemote from '@/components/Tree/TreeSelectRemote.vue'
import {getAllMachineTypeApi} from '@/api/machine-type'
import VirtualizedSelectFromUrl from '@/components/Selection/VirtualizedSelectFromUrl.vue'
import SearchButton from "@/components/Button/SearchButton.vue";
import ExportButton from "@/components/Button/ExportButton.vue";
import {downloadFile} from "@/utils/response";
import useRequest from "@/hooks/web/useRequest";
import DrawerForm from "@/components/Form/DrawerForm.vue";
import MachineCard from '@/views/category/machine/components/MachineCard.vue'
import { useAppStore } from '@/store/modules/app'

const {t} = useLang()
const { hasAction } = usePermission()

const columns = computed<TableColumn[]>(() => [
  {type: 'index', label: 'STT', width: 60},
  {prop: 'area.name', label: t('fields.area')},
  {prop: 'machineType.name', label: t('machine.type')},
  {prop: 'name', label: t('machine.name')},
  {prop: 'code', label: t('machine.code')},
  {
    prop: 'displayStatus',
    label: t('fields.status'),
    slots: {
      default: ({row}) => (<span style={{
        color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)'
      }}>{enumLabel('commonStatusList', row?.status, row?.displayStatus)}</span>)
    },
  },
  {
    label: t('fields.action'),
    width: '110px',
    slots: {
      default: (scope: any) => (
          <div>
            <EditCircleButton onClick={() => openDialogEdit(scope)}></EditCircleButton>
            <DeleteCircleButton onClick={() => openDelete(scope)}></DeleteCircleButton>
          </div>
      ),
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()

const formModel = ref<any>({})

const openDialogAdd = () => {
  formModel.value = {
    machineDetail: {},
    machineTransformer: {},
    machineCircuitBreaker: {},
    machineDisconnectingSwitch: {},
    dictMachineParts: {},
    status: STATUS_ACTIVE,
  }
  dialogVisible.value = true
}
const detailLoading = ref(false)
const openDialogEdit = (scope: any) => {
  detailLoading.value = true
  detailMachineApi(scope.row.id)
      .then((res: any) => {
        res.data.machineDetail ??= {}
        res.data.machineTransformer ??= {}
        res.data.machineCircuitBreaker ??= {}
        res.data.machineDisconnectingSwitch ??= {}
        formModel.value = res.data
        dialogVisible.value = true
      })
      .finally(() => {
        detailLoading.value = false
      })
}

const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteMachineApi, scope.row.id)
}

const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}

const {onRequest: requestExport, isLoading: isLoadingExport} = useRequest()
const exportFile = (searchParams: any) => {
  requestExport(exportMonitorPointsApi, searchParams).then((res) => {
    downloadFile(res)
  })
}
const visibleUpload = ref(false);
const showImport = () => {
  visibleUpload.value = true
}
const exportEICFile = (searchParams: any) => {
  requestExport(exportMachineIECApi, searchParams).then((res) => {
    downloadFile(res)
  })
}

const uploadApi = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return importIECApi(formData)
}
const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <list-template
      :show-btn-add="hasAction('machine-list', 'create')"
      ref="elTableRef"
      :search-props="{ visibleSearchButton: false }"
      key-list="machine-list"
      :columns="columns"
      :use-table-config="{
          fetchDataApi: getMachineListApi,
        }"
      @addHandler="openDialogAdd"
      :card-component="MachineCard"
      v-loading="detailLoading"
      :title="t('machine.listTitle')"
      @edit="openDialogEdit"
      @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams }">
      <div class="filter-item">
        <div class="filter-label">{{ t('machine.searchLabel') }}</div>
        <el-input class="filter-input" v-model="searchParams.name" clearable :placeholder="t('machine.namePlaceholder')"/>
      </div>
      <div class="filter-item">
        <div class="filter-label">{{ t('fields.area') }}</div>
        <tree-select-remote
            v-model="searchParams.areaId"
            :request-fn="getAllTreeAreaApi"
            filterable
            clearable
        />
      </div>
      <div class="filter-item">
        <div class="filter-label">{{ t('machine.type') }}</div>
        <virtualized-select-from-url
            v-model="searchParams.machineTypeId"
            :request-fn="getAllMachineTypeApi"
            filterable
            clearable
            value-key="id"
        />
      </div>
      <div class="flex flex-col md:flex-row justify-center gap-2 w-full md:w-fit">
        <search-button class="!m-0" @click="elTableRef?.refresh()"/>
        <export-button class="!m-0" @click="() => exportFile(searchParams)" :loading="isLoadingExport"/>
        <el-button class="!m-0 !h-[40px]" @click="() => exportEICFile(searchParams)" :loading="isLoadingExport">Export IEC
        </el-button>
        <el-button class="!m-0 !h-[40px] w-full md:w-fit" @click="showImport">Import IEC</el-button>
      </div>
    </template>
  </list-template>
  <base-dialog
      v-model="visibleUpload"
      title="Import IEC"
      :size="isMobile ? '100%': '50%'"
  >
    <base-upload
        :api="uploadApi"
        @success="() => visibleUpload = false"
    ></base-upload>
  </base-dialog>
  <drawer-form
      v-model="dialogVisible"
      align-center
      :destroy-on-close="true"
      :size="isMobile ? '100%': '50%'"
  >
    <machine-form
        v-model:formModel="formModel"
        @success="saveSuccess"
        :title="formModel.id ? t('machine.edit') : t('machine.add')"
    ></machine-form>
  </drawer-form>
</template>
