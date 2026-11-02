<template>
  <el-drawer
      :lock-scroll="false"
      :destroy-on-close="true"
      :append-to-body="true"
      @open="dialogOpen"
      header-class="!mb-2"
      :show-close="false"
      v-bind="$attrs">
    <template #header>
      <DrawerTitle
          :title="t('machinePart.setupThreshold')"
          :crumbs="crumbs"
      >
        <template #icon>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
          </svg>
        </template>
      </DrawerTitle>
    </template>
    <!-- Tách 2 tab domain Nhiệt độ / Phóng điện (PD) - đây là nơi cấu hình "Khai báo chung từ loại thiết
         bị" hiện ra ở MachinePointDialog.vue (Khai báo riêng theo bộ phận). -->
    <el-tabs v-model="domainTab" class="threshold-domain-tabs">
      <el-tab-pane name="thermal" :label="t('machinePart.thermalThreshold')">
        <div class="threshold-pane">
          <threshold-tab :threshold-list="thermalThresholdList" :context="[t('machinePart.thermalThreshold')]">
            <template #toolbar>
              <ThresholdFilter
                  v-model="thermalSelectedTypes"
                  :options="thermalThresholdTypeOptions"
                  @change="changeThresholdTypeList"
              />
            </template>
          </threshold-tab>
        </div>
      </el-tab-pane>
      <el-tab-pane name="pd" :label="t('machinePart.pdThreshold')">
        <div class="threshold-pane">
          <threshold-tab :threshold-list="pdThresholdList" :context="[t('machinePart.pdThreshold')]">
            <!-- Single-select - PD chỉ chọn 1 trong 2 kiểu (ΔPD%/tháng HOẶC ngưỡng dB tuyệt đối). -->
            <template #toolbar>
              <el-select
                  v-model="pdSelectedType"
                  value-key="id"
                  clearable
                  size="small"
                  style="width: 270px"
                  :placeholder="t('machinePart.pdThresholdType')"
              >
                <el-option v-for="item in pdThresholdTypeOptions" :key="item.id" :label="item.name" :value="item"/>
              </el-select>
            </template>
            <!-- Công thức ΔPD%/tháng MẶC ĐỊNH cho mọi bộ phận thuộc loại này (bộ phận nào có công thức riêng
                 thì công thức riêng ưu tiên hơn - xem MachinePointDialog.vue). -->
            <template #extra="{ mode }">
              <PdFormulaSection v-if="mode.id === PD_GROWTH_RATE_ID" :target-type="2" :target-id="props.partId"/>
            </template>
          </threshold-tab>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="flex justify-between md:justify-start space-x-2">
        <cancel-button @click="emits('cancel')"></cancel-button>
        <el-button
            type="primary"
            @click="emits('save', thresholdList)"
        >{{ t('machinePart.saveConfig') }}</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import {computed, ref} from 'vue'
import CancelButton from '@/components/Button/CancelButton.vue'
import {cloneObject} from "@/utils/objectUtils";
import {buildDefaultThresholds} from "@/views/category/machine/components/levels";
import ThresholdTab from "@/views/category/machine/components/ThresholdTab.vue";
import {useConfigStore} from "@/store/modules/configStore";
import ThresholdFilter from "@/views/category/machine-part/components/ThresholdFilter.vue";
import PdFormulaSection from '@/views/category/machine/components/PdFormulaSection.vue'
import DrawerTitle from '@/components/Dialog/DrawerTitle.vue'

const { t } = useLang()

// ThresholdType.PdGrowthRate (7) / PdLevelDb (8) - xem Enums.cs (BE).
const PD_THRESHOLD_TYPE_IDS = [7, 8]
const PD_LEVEL_DB_ID = 8
const PD_GROWTH_RATE_ID = 7
const configStore = useConfigStore();
const allThresholdTypeOptions = computed(() => configStore.getConfig('thresholdTypeList') ?? [])
const thermalThresholdTypeOptions = computed(() =>
    allThresholdTypeOptions.value.filter((item: any) => !PD_THRESHOLD_TYPE_IDS.includes(item.id)),
)
const PD_THRESHOLD_TYPE_KEYS: Record<number, string> = {
  [PD_GROWTH_RATE_ID]: 'machinePart.pdGrowthRate',
  [PD_LEVEL_DB_ID]: 'machinePart.pdLevelDb',
}
const pdThresholdTypeOptions = computed(() =>
    allThresholdTypeOptions.value
        .filter((item: any) => PD_THRESHOLD_TYPE_IDS.includes(item.id))
        .map((item: any) => ({ ...item, name: PD_THRESHOLD_TYPE_KEYS[item.id] ? t(PD_THRESHOLD_TYPE_KEYS[item.id]) : item.name }))
        .sort((a: any, b: any) => (a.id === PD_LEVEL_DB_ID ? -1 : b.id === PD_LEVEL_DB_ID ? 1 : 0)),
)
const domainTab = ref<'thermal' | 'pd'>('thermal')

// Props
const props = defineProps({
  thresholdList: {
    type: Array<any>,
    required: true,
  },
  machinePartThresholdList: {
    type: Array<any>,
    required: false,
  },
  // Id loại bộ phận đang sửa - undefined khi đang thêm mới (chưa lưu) - xem PdFormulaAssignmentPicker.vue.
  partId: {
    type: Number,
    required: false,
  },
  // Ngữ cảnh hiển thị trên tiêu đề, vd. [tên loại thiết bị, tên bộ phận]
  crumbs: {
    type: Array<string | undefined | null>,
    default: () => [],
  },
})

// Emits
const emits = defineEmits(['save', 'cancel', 'update:thresholdList'])

const thresholdListModel = ref<any[]>([])

const dialogOpen = () => {
  thresholdListModel.value = props.thresholdList
  domainTab.value = 'thermal'
}
const changeThresholdTypeList = () => {
  const listModeTmp: any[] = [];
  thresholdListModel.value.forEach((mode: any) => {
    const modeTmp = cloneObject(mode)
    const oldMode = props.thresholdList ?
        props.thresholdList.find(item => item.id === modeTmp.id) :
        false;
    if (!oldMode) {
      modeTmp.temperatureThresholds = buildDefaultThresholds(mode.id)
      listModeTmp.push(modeTmp)
    } else {
      listModeTmp.push(oldMode)
    }
  })
  emits("update:thresholdList", listModeTmp)
}

const thermalSelectedTypes = computed<any[]>({
  get: () => thresholdListModel.value.filter((t: any) => !PD_THRESHOLD_TYPE_IDS.includes(t.id)),
  set: (val: any[]) => {
    thresholdListModel.value = [...val, ...thresholdListModel.value.filter((t: any) => PD_THRESHOLD_TYPE_IDS.includes(t.id))]
  },
})
const pdSelectedType = computed<any | null>({
  get: () => thresholdListModel.value.find((t: any) => PD_THRESHOLD_TYPE_IDS.includes(t.id)) ?? null,
  set: (val: any | null) => {
    const thermalPart = thresholdListModel.value.filter((t: any) => !PD_THRESHOLD_TYPE_IDS.includes(t.id))
    thresholdListModel.value = val ? [...thermalPart, val] : thermalPart
    changeThresholdTypeList()
  },
})

const thermalThresholdList = computed(() => (props.thresholdList ?? []).filter((t: any) => !PD_THRESHOLD_TYPE_IDS.includes(t.id)))
const pdThresholdList = computed(() => (props.thresholdList ?? []).filter((t: any) => PD_THRESHOLD_TYPE_IDS.includes(t.id)))
</script>

<style scoped>
.threshold-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.threshold-domain-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.threshold-domain-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 600;
}
</style>
