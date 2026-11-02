<template>
  <el-drawer
      @open="loadForm"
      :close-on-click-modal="false"
      :resizable="true"
      @close="() => (modelComponents = [])"
      :append-to-body="true"
      v-bind="$attrs"
      header-class="!m-0"
  >
    <template #header>
      <DrawerTitle
          :title="t('machine.componentSettingTitle')"
          :crumbs="[formModel?.name, machinePart?.name]"
      />
    </template>
    <div class="min-h-[300px]">
      <el-tabs
          v-model="editableTabsValue"
          type="card"
          class="demo-tabs"
          closable
          @tab-remove="removeTab"
          @tab-change="() => saveForm()"
      >
        <el-tab-pane
            v-for="(item, index) in modelComponents"
            :key="index"
            :label="item.name"
            :name="index"
        >
          <div class="drawer-body">
            <div class="form-grid">
              <el-form-item :label="t('fields.name')" label-width="100px"  labelPosition="top">
                <el-input v-model="item.name"></el-input>
              </el-form-item>
              <el-form-item
                v-if="formModel?.area && formModel.areaId"
                label-width="60px"
                :label="t('map.coordinates')"
                labelPosition="top"
              >
                <LatLngPicker
                  v-if="formModel?.area?.mapType === MAP_TYPE_MAP"
                  :map-config="item"
                  @input="(coordinate) => setCoordinate(index, coordinate)"
                />
                <lat-lng-image-picker
                  v-if="formModel?.area?.mapType === MAP_TYPE_PICTURE"
                  :image-path="formModel?.area?.photoPath"
                  :map-config="item"
                  @input="(coordinate) => setCoordinate(index, coordinate)"
                />
                <p v-if="item.longitude && item.latitude" class="m-0 whitespace-nowrap">
                  <span class="font-bold">{{ t('map.longitude') }}:</span> {{ item.longitude }},
                  <span class="font-bold">{{ t('map.latitude') }}:</span> {{ item.latitude }}
                </p>
              </el-form-item>
            </div>

            <el-form-item
              :label="t('machine.parentPart')"
              label-width="100px"
              labelPosition="top"
            >
              <select-options
                v-model="item.parentName"
                :options="formModel?.dictMachineParts?.[machinePart.parentId]?.machineComponents"
                value-key="name"
                col-value="name"
                col-label="name"
                :placeholder="t('machine.selectParentPart')"
                filterable
              >
              </select-options>
            </el-form-item>

            <el-form-item
              :label="t('machine.iecAddress')"
              prop="iecObjectAddress"
              label-width="100px"
              labelPosition="top"
            >
              <input-number v-model="item.iecObjectAddress" class="filter-input"></input-number>
            </el-form-item>
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item label="Camera" label-width="100px" labelPosition="top">
                  <virtualized-select-from-url
                    ref="cameraRef"
                    v-model="item.cameraId"
                    :request-fn="() => getAllCamerasApi({ areaId: formModel.areaId })"
                    filterable
                    value-key="id"
                    @selected="(cam: any) => onCameraSelected(index, cam)"
                    @change="() => changeCamera(index)"
                    clearable
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Sensor" label-width="100px" labelPosition="top">
                  <virtualized-select-from-url
                    ref="sensorRef"
                    v-model="item.sensorId"
                    :request-fn="() => getAllSensorsApi({ areaId: formModel.areaId })"
                    filterable
                    value-key="id"
                    @change="() => changeSensor(index)"
                    clearable
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <!-- Camera phóng điện (BatCam): không có điểm đo nhiệt, chọn ROI của camera. Cùng dữ liệu (pd_camera_rois)
                 với tab "Cấu hình giám sát phóng điện" trong màn Camera. -->
            <el-form-item
              v-if="item.cameraId && item.cameraIsPd"
              :label="t('machine.pdRoi')"
              label-position="top"
              label-width="120px"
            >
              <el-select
                :model-value="item.pdRois?.[0]?.cameraId === item.cameraId ? item.pdRois[0].roiIndex : null"
                :loading="pdRoiLoading"
                :placeholder="t('machine.selectPdRoi')"
                :no-data-text="t('machine.pdRoiEmpty')"
                clearable
                class="!w-full"
                @visible-change="(open: boolean) => open && loadPdRois(item.cameraId)"
                @change="(val: number | null) => selectPdRoi(index, val)"
              >
                <el-option
                  v-for="roi in pdRoiOptions[item.cameraId] ?? []"
                  :key="roi.roiIndex"
                  :value="roi.roiIndex"
                  :label="pdRoiLabel(roi)"
                  :disabled="isPdRoiUsed(roi, item)"
                />
              </el-select>
            </el-form-item>
            <div class="form-item-v" v-show="item.pdRois?.length">
              <p class="font-bold">{{ t('machine.pdRoiAssigned') }}</p>
              <div class="flex gap-2 mt-2">
                <el-tag v-for="roi in item.pdRois ?? []" :key="`${roi.cameraId}-${roi.roiIndex}`" closable @close="() => (item.pdRois = [])">
                  {{ roi.name || `ROI ${roi.roiIndex + 1}` }} (ROI {{ roi.roiIndex + 1 }})
                </el-tag>
              </div>
            </div>
            <el-form-item
              v-if="item.cameraId && !item.cameraIsPd"
              :label="t('machine.cameraPoints')"
              label-position="top"
              label-width="120px"
            >
              <ObjectSelectPoints
                :ref="(el) => (monitorPointCameraRefs[index] = el)"
                v-model="item.machineMonitorCameraPoints"
                :formModel="formModel"
                fieldPoint="machineMonitorCameraPoints"
                :exceptPoints="item.machineMonitorCameraPoints"
                :request-fn="() => getAllMonitorPointByCamApi(item.cameraId)"
                multiple
                value-key="monitorPointId"
                col-value="monitorPointId"
                col-label="name"
                :placeholder="t('machine.selectMonitorPoint')"
                filterable
              >
              </ObjectSelectPoints>
            </el-form-item>
            <el-form-item
              v-if="item.sensorId"
              label-position="top"
              :label="t('machine.sensorPoints')"
              label-width="120px"
            >
              <ObjectSelectPoints
                :ref="(el) => (monitorPointSensorRefs[index] = el)"
                v-model="item.machineMonitorSensorPoints"
                :formModel="formModel"
                fieldPoint="machineMonitorSensorPoints"
                :exceptPoints="item.machineMonitorSensorPoints"
                :request-fn="() => getAllMonitorPointBySensorApi(item.sensorId)"
                multiple
                value-key="monitorPointId"
                col-value="monitorPointId"
                col-label="name"
                :placeholder="t('machine.selectMonitorPoint')"
                filterable
              >
              </ObjectSelectPoints>
            </el-form-item>
            <div class="form-item-v" v-show="item?.machineMonitorCameraPoints?.length">
              <p class="font-bold">{{ t('machine.cameraPointList') }}</p>
              <div class="flex gap-2 mt-2">
                <machine-point-button
                  v-for="(point, pointIndex) in item?.machineMonitorCameraPoints ?? []"
                  :key="pointIndex"
                  :point="point"
                  class="mb-4"
                  @remove="
                  () => removeSettingMonitor(index, pointIndex, 'machineMonitorCameraPoints')
                "
                >
                </machine-point-button>
              </div>
            </div>
            <div class="form-item-v" v-show="item?.machineMonitorSensorPoints?.length">
              <p class="font-bold">{{ t('machine.sensorPointList') }}</p>
              <div class="flex gap-2 mt-2">
                <machine-point-button
                  v-for="(point, pointIndex) in item.machineMonitorSensorPoints ?? []"
                  :key="pointIndex"
                  :point="point"
                  class="mb-4"
                  @remove="
                  () => removeSettingMonitor(index, pointIndex, 'machineMonitorSensorPoints')
                "
                >
                </machine-point-button>
              </div>
            </div>
            <div class="form-item-v">
              <el-form-item
                v-show="item?.machineComponentThresholdList?.length"
                :label="t('machine.alertThreshold')"
                prop="machinePartThresholdList"
                label-width="120px"
                labelPosition="top"
              >
                <div class="flex flex-wrap gap-1">
                  <el-tag
                    v-for="(thresholdItem, index) in item?.machineComponentThresholdList ?? []"
                    :key="index"
                    :effect="thresholdItem?.temperatureThresholds?.length ? 'dark' : 'plain'"
                    :type="thresholdItem?.temperatureThresholds?.length ? 'success' : 'danger'"
                  >
                    {{ enumLabel('thresholdTypeList', thresholdItem.code, thresholdItem.name) }}
                  </el-tag>
                </div>
              </el-form-item>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane name="add" ref="add" :disabled="true">
          <template v-slot:label>
            <el-button
                slot="reference"
                :icon="Plus"
                style="margin: 0 1% 0 1%"
                @click.stop="addTab()"
            />
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <div class="flex justify-between md:flex-row gap-1">
        <div class="flex md:flex-row gap-1">
          <cancel-button :icon="null" class="w-full md:w-fit whitespace-nowrap" @click="emits('cancel')"></cancel-button>
          <el-button
            class="!m-0 w-full p-0 md:w-fit whitespace-nowrap" v-show="modelComponents.length" type="warning" @click="() => openTemperatureThreshold(editableTabsValue)">
            {{ t('machine.setupThreshold') }}
          </el-button>
        </div>
        <save-button class="!m-0 w-full md:w-fit whitespace-nowrap" @click="() => saveForm(true)" :icon="null"></save-button>
      </div>
    </template>
  </el-drawer>

  <MachinePointDialog
      v-model="dialogMachinePointVisible"
      v-model:threshold-list="machineMonitorPoint"
      v-model:machinePartThresholdList="machinePartThresholdList"
      :component-id="modelComponents[componentIndexValue]?.id"
      :crumbs="[formModel?.name, modelComponents[componentIndexValue]?.name]"
      @save="saveMachinePoint"
      @cancel="dialogMachinePointVisible = false"
      :append-to-body="true"
      align-center
      class="h-fit"
      :size="isMobile ? '100%': '50%'"
  ></MachinePointDialog>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import { enumLabel } from '@/utils/enumLabel'
import VirtualizedSelectFromUrl from '@/components/Selection/VirtualizedSelectFromUrl.vue'
import {getAllCamerasApi} from '@/api/camera'
import {getBatcamRoisApi} from '@/api/batcam-config'
import {CAMERA_PD_TYPE} from '@/constants'
import { computed, nextTick, ref} from 'vue'
import {getAllSensorsApi} from '@/api/sensor'
import {getAllMonitorPointByCamApi, getAllMonitorPointBySensorApi} from '@/api/monitor-point'
import MachinePointButton from '@/views/category/machine/components/MachinePointButton.vue'
import {cloneObject} from '@/utils/objectUtils'
import SaveButton from '@/components/Button/SaveButton.vue'
import CancelButton from '@/components/Button/CancelButton.vue'
import {TabPaneName} from 'element-plus'
import {Plus} from '@element-plus/icons-vue'
import MachinePointDialog from '@/views/category/machine/components/MachinePointDialog.vue'
import {MAP_TYPE_MAP, MAP_TYPE_PICTURE} from '@/constants'
import LatLngPicker from '@/components/Map/LatLngPicker.vue'
import LatLngImagePicker from '@/components/Map/LatLngImagePicker.vue'
import SelectOptions from "@/components/Selection/SelectOptions.vue";
import ObjectSelectPoints from "@/views/category/machine/components/ObjectSelectPoints.vue";
import InputNumber from "@/components/Input/InputNumber.vue";
import { useAppStore } from '@/store/modules/app'
import DrawerTitle from '@/components/Dialog/DrawerTitle.vue'

const { t } = useLang()

const emits = defineEmits(['cancel', 'save'])
const editableTabsValue = ref(0)
const props = defineProps({
  formModel: {
    type: Object,
    required: true,
  },
  machinePartId: {
    type: [String, Number],
    required: true,
  },
  machinePart: {
    type: Object,
    required: true,
  },
})

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)

const machineComponent = ref({
  cameraId: null,
  sensorId: null,
  name: '',
  machineMonitorSensorPoints: [],
  machineMonitorCameraPoints: [],
})
const modelComponents = ref<any[]>([])
const machineComponentDefault = JSON.parse(JSON.stringify(machineComponent.value))

const monitorPointCameraRefs = ref<any[]>([])
const monitorPointSensorRefs = ref<any[]>([])

const loadForm = () => {
  const components = cloneObject(
      props.formModel?.dictMachineParts?.[props.machinePartId]?.machineComponents,
      [],
  ) ?? [getDefaultMachineComponent()]
  components.map(function (componentItem: any) {
    componentItem.parentName = getParentName(componentItem)
  })

  modelComponents.value = components
  editableTabsValue.value = 0
}

const getParentName = (componentItem: any) => {
  if (componentItem.parentName) {
    return componentItem.parentName;
  }
  if (!componentItem.parentName &&
      props.formModel?.dictMachineParts?.[props.machinePart.parentId]?.machineComponents.length) {
    return props.formModel?.dictMachineParts?.[props.machinePart.parentId]?.machineComponents[0].name
  }
  return null;
}

const getDefaultMachineComponent = () => {
  const tmp = cloneObject(machineComponentDefault)
  tmp.name = props.machinePart?.name + ' ' + (modelComponents.value.length + 1)
  tmp.parentName = getParentName(tmp)
  tmp.machinePartThresholdList = props.machinePart.machinePartThresholdList
  return tmp
}

const addTab = () => {
  modelComponents.value.push(getDefaultMachineComponent())
  editableTabsValue.value = modelComponents.value.length - 1
  saveForm()
}
const removeTab = (targetName: TabPaneName) => {
  modelComponents.value.splice(targetName as number, 1)
  editableTabsValue.value = modelComponents.value.length - 1
  saveForm()
}

const saveForm = (closeSetting = false) => {
  emits('save', modelComponents.value, closeSetting)
}
const changeCamera = (index: number) => {
  nextTick(() => {
    monitorPointCameraRefs?.value?.[index]?.fetch()
    modelComponents.value[index].machineMonitorCameraPoints = []
  })
}

// ── Camera phóng điện (BatCam FX2): chọn ROI thay cho điểm đo nhiệt ─────────────────────────
const pdRoiOptions = ref<Record<number, any[]>>({})
const pdRoiLoading = ref(false)

const onCameraSelected = (index: number, cam: any) => {
  const item = modelComponents.value[index]
  item.cameraIsPd = cam?.cameraType === CAMERA_PD_TYPE
  if (item.cameraIsPd) loadPdRois(item.cameraId)
}

// ROI lấy từ chính thiết bị (kèm bộ phận đang gán), giống tab cấu hình giám sát phóng điện của camera.
const loadPdRois = async (cameraId: number) => {
  if (!cameraId) return
  pdRoiLoading.value = true
  try {
    pdRoiOptions.value[cameraId] = ((await getBatcamRoisApi(cameraId)).data ?? []).filter((r: any) => r.enabled)
  } catch {
    pdRoiOptions.value[cameraId] = []
  } finally {
    pdRoiLoading.value = false
  }
}

const pdRoiLabel = (roi: any) => {
  const base = `ROI ${roi.roiIndex + 1}`
  const assigned = roi.name || roi.machineComponentName
  return assigned ? `${base} - ${assigned}` : base
}

// ROI đang gán cho bộ phận khác thì không chọn được; ROI của chính bộ phận này vẫn chọn lại được.
const isPdRoiUsed = (roi: any, item: any) =>
    !!roi.machineComponentId && roi.machineComponentId !== item.id

const selectPdRoi = (index: number, roiIndex: number | null) => {
  const item = modelComponents.value[index]
  const roi = (pdRoiOptions.value[item.cameraId] ?? []).find((r: any) => r.roiIndex === roiIndex)
  item.pdRois = roi
      ? [{
        cameraId: item.cameraId,
        roiIndex: roi.roiIndex,
        cx: roi.cx,
        cy: roi.cy,
        nw: roi.nw,
        nh: roi.nh,
        name: roi.name || item.name,
      }]
      : []
}
const changeSensor = (index: number) => {
  nextTick(() => {
    monitorPointSensorRefs?.value?.[index]?.fetch()
    modelComponents.value[index].machineMonitorSensorPoints = []
  })
}

const removeSettingMonitor = (componentIndex: number, pointIndex: number, field: string) => {
  modelComponents.value[componentIndex][field].splice(pointIndex, 1)
}
const dialogMachinePointVisible = ref(false)
const componentIndexValue = ref<number>(0)
const machineMonitorPoint = ref<any[]>([])
const machinePartThresholdList = ref<any[]>([])
const openTemperatureThreshold = (componentIndex: number) => {
  componentIndexValue.value = componentIndex
  machineMonitorPoint.value = cloneObject(
      modelComponents.value[componentIndex]?.machineComponentThresholdList ?? [],
  )
  machinePartThresholdList.value = cloneObject(
      modelComponents.value[componentIndex]?.machinePartThresholdList ?? [],
  )
  dialogMachinePointVisible.value = true
}
const saveMachinePoint = (data: any) => {
  modelComponents.value[componentIndexValue.value].machineComponentThresholdList = data
  dialogMachinePointVisible.value = false
}

const setCoordinate = (componentIndex: number, coordinate: any) => {
  modelComponents.value[componentIndex] = {
    ...modelComponents.value[componentIndex],
    ...coordinate,
  }
}
</script>
<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.form-item {
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  gap: 15px;
}

.form-item label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.form-item label .required {
  color: var(--danger);
  margin-left: 3px;
}

.btn-coord {
  background: #F59E0B;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: 0.2s;
  width: 100%;
}

.btn-coord:hover {
  background: #D97706;
  transform: translateY(-1px);
}

/* New Part - Monitoring Points Styles */
.monitoring-table {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 10px;
}

.mt-header {
  display: grid;
  grid-template-columns: 1fr 1fr 50px;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 1px solid var(--border);
}

.mt-row {
  display: grid;
  grid-template-columns: 1fr 1fr 50px;
  padding: 12px 20px;
  font-size: 13px;
  align-items: center;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.mt-row:last-child {
  border-bottom: none;
}

.mt-nested {
  padding-left: 45px;
}

.point-tag {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.point-tag-outline {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.point-tag-solid {
  background: var(--bg-body);
  color: var(--text-main);
  border: 1px solid var(--border);
}

.btn-action-sm {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-sub);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-action-sm:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--primary);
}

@media screen and (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .form-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .mt-header,
  .mt-row {
    grid-template-columns: 1fr 1fr 40px;
    padding: 12px 10px;
  }

  .mt-nested {
    padding-left: 20px;
  }
}
.tab-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
  justify-content: space-between;
}

.tab-btn.active {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.btn-orange-full {
  background: #F59E0B;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.btn-orange-full:hover {
  background: #D97706;
}

.point-tag-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
}

.point-tag-item .remove-tag {
  color: var(--text-sub);
  cursor: pointer;
  font-size: 16px;
}

.form-item-v {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-item-v label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}
</style>
