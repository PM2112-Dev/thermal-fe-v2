<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import { useLang } from '@/hooks/web/useI18n'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import {TableColumn} from '@/components/Table'
import {computed, ref} from 'vue'
import BaseDialog from '@/components/Dialog/BaseDialog.vue'
import {ElButton, ElTooltip} from 'element-plus'
import {Refresh, Rank, Aim, Notification, Pointer} from '@element-plus/icons-vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import {CAMERA_NORMAL_TYPE, STATUS_ACTIVE} from '@/constants'
import {
  getCameraListApi,
  deleteCameraApi,
  syncPresetsApi,
  getCameraDetailApi,
  listPresetsApi,
  importCameraIECApi,
  exportCameraIECApi
} from '@/api/camera'
import {getAllTreeAreaApi} from '@/api/area'
import CameraFormTab from '@/views/category/camera/components/CameraFormTab.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import TreeSelectRemote from '@/components/Tree/TreeSelectRemote.vue'
import useRequest from '@/hooks/web/useRequest'
import PresetTourTab from '@/views/category/camera/components/PresetTourTab.vue'
import CameraVisionPreset from '@/views/category/camera/components/CameraVisionPreset.vue'
import AiSetting from '@/views/category/camera/components/AiSetting.vue'
import SearchButton from '@/components/Button/SearchButton.vue'
import DrawerForm from '@/components/Form/DrawerForm.vue'
import {useRouter} from 'vue-router';
import {downloadFile} from "@/utils/response";
import CameraCard from '@/views/category/camera/components/CameraCard.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()

const router = useRouter();

const columns = computed<TableColumn[]>(() => [
  {type: 'index', label: t('fields.index'), width: 60, headerAlign: 'center'},
  {prop: 'code', label: t('camera.code')},
  {
    prop: 'name',
    label: t('camera.name'),
    slots: {
      default: ({ row }) => (
          <span
              class="text-blue-600 hover:underline cursor-pointer"
              onClick={() => redirectDetail(row)}
          >
        {row.name}
      </span>
      )
    },
  },
  {prop: 'area.name', label: t('fields.area')},
  {prop: 'cameraTypeObject.name', label: t('camera.function')},
  {
    prop: 'deviceStatusObject.name',
    label: t('fields.status'),
    width: '150px',
    slots: {
      default: ({row}) => (<span style={{
        color: row.deviceStatusObject.code !== 'Off' ? 'var(--success)' : 'var(--danger)'
      }}>{enumLabel('deviceStatusList', row?.deviceStatusObject?.code, row?.deviceStatusObject?.name)}</span>)
    },
  },
  {
    label: t('fields.action'),
    width: '300px',
    slots: {
      default: (scope: any) => (
          <div>
            <ElTooltip content={t('camera.syncPresets')}>
              <ElButton circle={true} icon={Refresh} onClick={() => syncPresets(scope.row)}/>
            </ElTooltip>
            <ElTooltip content={t('camera.viewPresets')}>
              <ElButton circle={true} icon={Rank} onClick={() => showPresets(scope.row)}/>
            </ElTooltip>
            <ElTooltip content={t('camera.adjustPresets')}>
              <ElButton
                circle={true}
                icon={Aim}
                style={{
                  visibility:
                    scope.row.cameraType === CAMERA_NORMAL_TYPE
                      ? 'visible'
                      : 'hidden'
                }}
                onClick={() => showVisionPresets(scope.row)}
              />
            </ElTooltip>
            <ElTooltip content={t('camera.presetSettings')}>
              <ElButton circle={true} icon={Pointer} onClick={() => showPresetSetting(scope.row)}/>
            </ElTooltip>
            <ElTooltip content={t('camera.aiSettings')}>
              <ElButton circle={true} icon={Notification} onClick={() => showAISetting(scope.row)}/>
            </ElTooltip>
            <EditCircleButton onClick={() => openDialogEdit(scope)}></EditCircleButton>
            <DeleteCircleButton onClick={() => openDelete(scope)}></DeleteCircleButton>
          </div>
      ),
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()

const formModel = ref({})
const presets = ref([])
const cameraTours = ref([])
const presetDialogVisible = ref(false)
const presetVisionVisible = ref(false)

const {onRequest: presetRequest, isLoading: syncPresetLoading} = useRequest()
const syncPresets = (item: any) => {
  presetRequest(syncPresetsApi, item.id).then((res) => {
    presets.value = res.data.presets
    cameraTours.value = res.data.cameraTours
    presetDialogVisible.value = true
  })
}

const showPresetSetting = (item: any) => {
  return router.push({name: 'camera_setting', params: {id: item.id}})
}

const showPresets = (item: any) => {
  presetRequest(listPresetsApi, item.id).then((res) => {
    presets.value = res.data.presets
    cameraTours.value = res.data.cameraTours
    presetDialogVisible.value = true
  })
}

const visionCamera = ref(null)
const showVisionPresets = (item: any) => {
  presetVisionVisible.value = true
  visionCamera.value = item
}

const aiSettingDialogVisible = ref(false)
const selectedCamera = ref()
const showAISetting = (row: object) => {
  aiSettingDialogVisible.value = true
  selectedCamera.value = row
}
const openDialogAdd = () => {
  formModel.value = {
    cameraType: CAMERA_NORMAL_TYPE,
    status: STATUS_ACTIVE,
  }
  dialogVisible.value = true
}

const detailLoading = ref(false);
const openDialogEdit = (scope: any) => {
  detailLoading.value = true
  getCameraDetailApi(scope.row.id)
      .then((res) => {
        formModel.value = res.data
        dialogVisible.value = true
      })
      .finally(() => {
        detailLoading.value = false
      })
}

const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteCameraApi, scope.row.id)
}

const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}

const {onRequest: requestExport, isLoading: isLoadingExport} = useRequest()

const visibleUpload = ref(false);
const showImport = () => {
  visibleUpload.value = true
}

const exportEICFile = (searchParams: any) => {
  requestExport(exportCameraIECApi, searchParams).then((res) => {
    downloadFile(res)
  })
}

const uploadApi = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return importCameraIECApi(formData)
}

const redirectDetail = (row) => {
  return router.push({name: 'live_detail', params: {id: row.id}})
}

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <div v-loading="syncPresetLoading">
    <list-template
        :show-btn-add="hasAction('camera-list', 'create')"
        ref="elTableRef"
        key-list="camera-list"
        :columns="columns"
        :card-component="CameraCard"
        :use-table-config="{
          fetchDataApi: getCameraListApi,
        }"
        :search-props="{
          className: ''
        }"
        @addHandler="openDialogAdd"
        :title="t('camera.listTitle')"
        @syncPresets="syncPresets"
        @showPresets="showPresets"
        @edit="openDialogEdit"
        @delete="openDelete"
        @showPresetSetting="showPresetSetting"
        @showVisionPresets="showVisionPresets"
        @showAISetting="showAISetting"
        @redirectDetail="redirectDetail"
    >
      <template slot="search" v-slot="{ searchParams, tableMethods }">
        <div class="filter-row">
          <div class="filter-item">
            <div class="filter-label">{{ t('camera.searchLabel') }}</div>
            <el-input v-model="searchParams.name" class="filter-input" clearable :placeholder="t('camera.searchPlaceholder')"/>
          </div>
          <div class="filter-item">
            <div class="filter-label">{{ t('camera.functionShort') }}</div>
            <select-from-config
                class="filter-input"
                key-config="cameraTypeList"
                clearable
                v-model="searchParams.cameraType"
            ></select-from-config>
          </div>
          <div class="filter-item">
            <div class="filter-label">{{ t('fields.area') }}</div>
            <tree-select-remote
                class="filter-input"
                v-model="searchParams.areaId"
                :request-fn="getAllTreeAreaApi"
                filterable
                clearable
            />
          </div>
          <search-button @click="tableMethods.getList"></search-button>
          <el-button class="!h-[40px] w-full md:w-fit" @click="() => exportEICFile(searchParams)" :loading="isLoadingExport">Export
          </el-button>
          <el-button class="!h-[40px] w-full md:w-fit" @click="showImport">Import IEC</el-button>
        </div>
      </template>
    </list-template>
    <base-dialog
        v-model="visibleUpload"
        title="Import IEC"
        width="500px"
    >
      <base-upload
          :api="uploadApi"
          @success="() => visibleUpload = false"
      ></base-upload>
    </base-dialog>
    <drawer-form v-model="dialogVisible" header-class="!m-0 !p-0" body-class="!pt-0" :append-to-body="true" :size="isMobile ? '100%': '900px'" :show-close="false">
      <camera-form-tab
        v-model:formModel="formModel"
        @success="saveSuccess"
        v-loading="detailLoading"
      ></camera-form-tab>
    </drawer-form>
    <drawer-form :show-close="true" header-class="!m-0" body-class="!pt-0" :size="isMobile ? '100%': '50%'" v-model="presetDialogVisible">
      <PresetTourTab :presets="presets" :tours="cameraTours"/>
    </drawer-form>
    <base-dialog
        v-model="presetVisionVisible"
        :destroy-on-close="true"
        :title="t('camera.presetParams')"
        :width="isMobile? '100%': '50%'"
        :show-close="true"
    >
      <CameraVisionPreset :visionCamera="visionCamera"/>
    </base-dialog>
    <drawer-form v-model="aiSettingDialogVisible" :destroy-on-close="true" :title="t('camera.aiSettings')" :size="isMobile ? '100%': '70%'">
      <ai-setting :camera="selectedCamera" @saved="aiSettingDialogVisible = false"/>
    </drawer-form>
  </div>
</template>
