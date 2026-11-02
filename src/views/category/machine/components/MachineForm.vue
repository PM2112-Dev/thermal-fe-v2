<template>
  <FormWrapper
      :form-model="formModel"
      :form-props="{ labelWidth: '200px', rules: formRules, labelPosition: isMobile ? 'top': 'left' }"
      :request-fn="isEditing ? editMachineApi : addMachineApi"
      :isEditing="isEditing"
      @success="handleSuccess"
  >
    <template v-slot="{ formErrors }">
      <el-tabs type="border-card">
        <el-tab-pane :label="t('machine.tabGeneral')">
          <el-card>
            <template #header>
              <div class="card-header">
                <span class="font-bold">{{ t('machine.info') }}</span>
              </div>
            </template>
            <el-row :gutter="10">
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item :label="t('fields.area')" prop="areaId" :error="formErrors.AreaId">
                  <tree-select-remote
                      v-model="formModel.areaId"
                      :request-fn="getAllTreeAreaApi"
                      filterable
                      clearable
                      @node-click="handleAreaIdClick"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item
                    v-if="formModel?.area && formModel.areaId"
                    :label="t('map.coordinates')"
                    :error="formErrors.Latitude ?? formErrors.Longitude"
                    label-width="100px"
                >
                  <LatLngPicker
                      v-if="formModel?.area?.mapType === MAP_TYPE_MAP"
                      :map-config="formModel"
                      @input="setCoordinate"
                  />
                  <lat-lng-image-picker
                      v-if="formModel?.area?.mapType === MAP_TYPE_PICTURE"
                      :image-path="formModel?.area?.photoPath"
                      :map-config="formModel"
                      @input="setCoordinate"
                  />
                  <p v-if="formModel.longitude && formModel.latitude" class="m-0 whitespace-nowrap">
                    <span class="font-bold">{{ t('map.longitude') }}:</span> {{ formModel.longitude }},
                    <span class="font-bold">{{ t('map.latitude') }}:</span> {{ formModel.latitude }}
                  </p>
                </el-form-item>
              </el-col>
            </el-row>
            <!-- Vị trí marker tia sét trên bản đồ/sơ đồ - độc lập với "Tọa độ" nhiệt ở trên (Machine.PdLatitude/PdLongitude). -->
            <el-row :gutter="10">
              <el-col :span="isMobile ? 24 : 12"></el-col>
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item
                    v-if="formModel?.area && formModel.areaId"
                    :label="t('machine.pdCoordinates')"
                    label-width="100px"
                >
                  <LatLngPicker
                      v-if="formModel?.area?.mapType === MAP_TYPE_MAP"
                      :button-text="t('machine.pickPdOnMap')"
                      :map-config="pdMapConfig"
                      @input="setPdCoordinate"
                  />
                  <lat-lng-image-picker
                      v-if="formModel?.area?.mapType === MAP_TYPE_PICTURE"
                      :button-text="t('machine.pickPdOnImage')"
                      :image-path="formModel?.area?.photoPath"
                      :map-config="pdMapConfig"
                      @input="setPdCoordinate"
                  />
                  <p v-if="formModel.pdLongitude && formModel.pdLatitude" class="m-0 whitespace-nowrap">
                    <span class="font-bold">{{ t('map.longitude') }}:</span> {{ formModel.pdLongitude }},
                    <span class="font-bold">{{ t('map.latitude') }}:</span> {{ formModel.pdLatitude }}
                  </p>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item :label="t('machine.code')" prop="code" :error="formErrors.Code">
                  <el-input v-model="formModel.code"/>
                </el-form-item>
              </el-col>
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item
                    :label="t('machine.name')"
                    prop="code"
                    :error="formErrors.Name"
                    label-width="100px"
                >
                  <el-input v-model="formModel.name"/>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item
                    :label="t('machine.pollingInterval')"
                    prop="frequency"
                    :error="formErrors.Frequency"
                >
                  <InputNumber v-model="formModel.frequency"/>
                </el-form-item>
              </el-col>
              <el-col :span="isMobile ? 24 : 12">
                <el-form-item
                    :label="t('machine.type')"
                    prop="machineTypeId"
                    :error="formErrors.MachineTypeId"
                    label-width="110px"
                >
                  <virtualized-select-from-url
                      v-model="formModel.machineTypeId"
                      :request-fn="getAllMachineTypeApi"
                      filterable
                      value-key="id"
                      @change="changeMachineTypeId"
                      @selected="(value) => machineTypeCode = value.code"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="isMobile ? 24 : 12"></el-col>
              <el-col :span="isMobile ? 24 : 12">

                <el-form-item
                    :label="t('fields.status')"
                    prop="status"
                    :error="formErrors.Status"
                    label-width="100px"
                >
                  <select-from-config
                      key-config="commonStatusList"
                      v-model="formModel.status"
                      col-value="code"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
          <el-card v-if="formModel.machineTypeId && formModel.areaId" class="mt-4">
            <remote-table
                ref="machinePartTableRef"
                :row-key="(row) => row.id"
                :default-expand-all="true"
                :tree-props="{ children: 'children', checkStrictly: true }"
                :request-fn="() =>getMachinePartAllTreeApi({ machineTypeId: formModel.machineTypeId })"
                :columns="machinePartCols"
            />
          </el-card>
          <MachineSettingDialog
              :destroy-on-close="true"
              v-model="visibleSetting"
              :form-model="formModel"
              :machine-part="machinePartRow ?? {}"
              :machine-part-id="machinePartId"
              @cancel="()=> visibleSetting = false"
              @save="saveMachinePart"
              :size="isMobile ? '100%': '50%'"
          />
        </el-tab-pane>
        <el-tab-pane :label="t('machine.tabDetail')">
            <machine-detail
                :formModel="formModel"
                :machineDetail="formModel?.machineDetail"
                :machineTransformer="formModel?.machineTransformer"
                :machineCircuitBreaker="formModel?.machineCircuitBreaker"
                :machineDisconnectingSwitch="formModel?.machineDisconnectingSwitch"
                :machineTypeCode="machineTypeCode"
                :form-errors="formErrors"
            ></machine-detail>
        </el-tab-pane>
      </el-tabs>
    </template>
  </FormWrapper>
</template>

<script setup lang="tsx">
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import {computed, onMounted, ref} from 'vue'
import {rule} from '@/utils/validate'
import {isFormEditing} from '@/utils/is'
import {FormRules, ElButton, ElTag, ElCard} from 'element-plus'
import {addMachineApi, editMachineApi} from '@/api/machine'
import {getAllTreeAreaApi} from '@/api/area'
import VirtualizedSelectFromUrl from '@/components/Selection/VirtualizedSelectFromUrl.vue'
import {getAllMachineTypeApi} from '@/api/machine-type'
import InputNumber from '@/components/Input/InputNumber.vue'
import {getMachinePartAllTreeApi} from '@/api/machine-part'
import TreeSelectRemote from '@/components/Tree/TreeSelectRemote.vue'
import LatLngPicker from '@/components/Map/LatLngPicker.vue'
import LatLngImagePicker from '@/components/Map/LatLngImagePicker.vue'
import {MAP_TYPE_MAP, MAP_TYPE_PICTURE} from '@/constants'
import {Tools} from "@element-plus/icons-vue";
import 'element-tree-line/dist/style.css'
import MachineSettingDialog from "@/views/category/machine/components/MachineSettingDialog.vue";
import RemoteTable from "@/components/Table/RemoteTable.vue";
import SelectFromConfig from "@/components/Selection/SelectFromConfig.vue";
import MachineDetail from "@/views/category/machine/components/MachineDetail.vue";
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()

const machinePartTableRef = ref<InstanceType<typeof RemoteTable>>()


const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)

const visibleSetting = ref(false)

const formModel = defineModel<any>('formModel')
const renderCameraPointTags = (cameraPoints: any) => {
  return (
      <>
        {cameraPoints.map((item, index) => (
            <ElTag
                key={index}
                effect={item.comparationModeObjectList ? 'dark' : 'plain'}
                type={item.comparationModeObjectList ? 'success' : 'danger'}
            >
              {item?.name}
            </ElTag>
        ))}
      </>
  );
};

// ROI camera phóng điện (BatCam) gán cho bộ phận — hiển thị cùng các điểm đo nhiệt.
const renderPdRoiTags = (pdRois: any[]) => (
    <>
      {pdRois.map((roi) => (
          <ElTag key={`pd-${roi.cameraId}-${roi.roiIndex}`} effect="plain" type="warning">
            {roi.name || `ROI ${roi.roiIndex + 1}`} (PD · ROI {roi.roiIndex + 1})
          </ElTag>
      ))}
    </>
)

const machinePartCols = computed(() => [
  {prop: 'name', label: t('machine.partName')},
  {
    prop: 'machineType.name',
    label: t('machine.monitorPoint'),
    slots: {
      default: (scope: any) => (
          <div class="flex flex-wrap gap-2">
            {
              formModel.value?.dictMachineParts?.[scope.row.id]?.machineComponents?.map((machineComponent: any) => (
                  <ElCard
                      key={machineComponent.id}
                      class="w-fit"
                      shadow="hover"
                      headerClass="!p-1 text-center font-medium"
                      bodyClass="!p-2"
                  >
                    {{
                      header: () => <>{machineComponent.name}</>,
                      default: () => (
                          <div class="flex flex-wrap gap-2">
                            {renderCameraPointTags(machineComponent?.machineMonitorCameraPoints ?? [])}
                            {renderCameraPointTags(machineComponent?.machineMonitorSensorPoints ?? [])}
                            {renderPdRoiTags(machineComponent?.pdRois ?? [])}
                          </div>
                      )
                    }}
                  </ElCard>
              ))
            }
          </div>
      ),
    },
  },
  {
    width: '80px',
    slots: {
      default: (scope: any) => (
          <div>
            <ElButton
                onClick={() => openMachineSetting(scope.row)}
                icon={Tools}
            ></ElButton>
          </div>
      ),
    },
  },
])

const machinePartId = ref(0)
let machinePartRow = null
const openMachineSetting = (row: any) => {
  machinePartId.value = row.id ?? 0
  machinePartRow = row
  visibleSetting.value = true
}

const saveMachinePart = (machineComponents: any, closeSetting = false) => {
  const form = formModel.value
  form.dictMachineParts[machinePartId.value] = {
    ...machinePartRow ?? {},
    machineTypeId: formModel.value.machineTypeId,
    machineComponents: machineComponents
  }
  emits('update:formModel', form)
  if (closeSetting) {
    visibleSetting.value = false
  }
}

const isEditing = computed(() => {
  return isFormEditing(formModel.value)
})

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    areaId: [rule('required', true)],
    machineTypeId: [rule('required', true)],
    name: [rule('required', true)],
    code: [rule('required', true)],
    frequency: [rule('required', true)],
  }

  return rules
})

const emits = defineEmits(['update:formModel', 'success'])
const handleSuccess = (data: any) => {
  emits('success', data)
}

const changeMachineTypeId = () => {
  machinePartTableRef?.value?.fetch()
}

const machineTypeCode = ref(null);

onMounted(() => {
  machineTypeCode.value = formModel.value?.machineType?.code
})

const handleAreaIdClick = (area: any) => {
  const form = {...formModel.value, ...{area: area, areaId: area.id}}
  emits('update:formModel', form)
}

const updateFormModel = (node: any) => {
  emits('update:formModel', {...formModel.value, ...node})
}
const setCoordinate = (coordinate: any) => {
  updateFormModel(coordinate)
}

// pdLatitude/pdLongitude/pdZoom của formModel remap qua latitude/longitude/zoom cho LatLngPicker dùng
// chung, và remap ngược khi lưu - xem Machine.PdLatitude/PdLongitude (BE).
const pdMapConfig = computed(() => ({
  latitude: formModel.value?.pdLatitude,
  longitude: formModel.value?.pdLongitude,
  zoom: formModel.value?.pdZoom,
}))
const setPdCoordinate = (coordinate: any) => {
  const node: any = {}
  if ('latitude' in coordinate) node.pdLatitude = coordinate.latitude
  if ('longitude' in coordinate) node.pdLongitude = coordinate.longitude
  if ('zoom' in coordinate) node.pdZoom = coordinate.zoom
  updateFormModel(node)
}
</script>
