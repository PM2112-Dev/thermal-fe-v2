<template>
  <el-drawer
      :lock-scroll="false"
      :destroy-on-close="true"
      :append-to-body="true"
      @open="dialogOpen"
      header-class="!mb-2"
      :center="true"
      align-center
      :show-close="false"
      v-bind="$attrs">
    <template #header>
      <DrawerTitle
          :title="t('machine.setupThreshold')"
          :crumbs="crumbs"
      >
        <template #icon>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
          </svg>
        </template>
      </DrawerTitle>
    </template>
    <!-- Tách 2 tab domain Nhiệt độ / Phóng điện (PD) - 2 nghiệp vụ khác hẳn nhau (đơn vị, cách so sánh,
         công thức riêng cho PD), gộp chung 1 danh sách trước đây dễ chọn nhầm. -->
    <el-tabs v-model="domainTab" class="threshold-domain-tabs">
      <el-tab-pane name="thermal" :label="t('machine.thermalThreshold')">
        <div class="threshold-pane">
          <!-- Chung (kế thừa từ loại thiết bị, chỉ xem) / Riêng (của bộ phận này) -->
          <div v-if="hasInherited" class="scope-switch">
            <el-segmented v-model="thermalTabModel" :options="scopeOptions"/>
          </div>
          <threshold-tab
              v-if="hasInherited && thermalTabModel === 'gen'"
              key="thermal-gen"
              :threshold-list="thermalMachinePartThresholdList"
              :context="[t('machine.thermalThreshold'), t('machine.inheritFromType')]"
              readonly
          />
          <threshold-tab
              v-else
              key="thermal-main"
              :threshold-list="thermalThresholdList"
              :context="[t('machine.thermalThreshold'), t('machine.customThreshold')]"
          >
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
      <el-tab-pane name="pd" :label="t('machine.pdThreshold')">
        <div class="threshold-pane">
          <div v-if="hasInherited" class="scope-switch">
            <el-segmented v-model="pdTabModel" :options="scopeOptions"/>
          </div>
          <threshold-tab
              v-if="hasInherited && pdTabModel === 'gen'"
              key="pd-gen"
              :threshold-list="pdMachinePartThresholdList"
              :context="[t('machine.pdThreshold'), t('machine.inheritFromType')]"
              readonly
          />
          <threshold-tab
              v-else
              key="pd-main"
              :threshold-list="pdThresholdList"
              :context="[t('machine.pdThreshold'), t('machine.customThreshold')]"
          >
            <!-- Single-select - PD chỉ chọn 1 trong 2 kiểu (ΔPD%/tháng HOẶC ngưỡng dB tuyệt đối). -->
            <template #toolbar>
              <el-select
                  v-model="pdSelectedType"
                  value-key="id"
                  clearable
                  size="small"
                  style="width: 270px"
                  :placeholder="t('machine.pdThresholdType')"
              >
                <el-option v-for="item in pdThresholdTypeOptions" :key="item.id" :label="item.name" :value="item"/>
              </el-select>
            </template>
            <!-- Công thức ΔPD%/tháng RIÊNG của bộ phận - chưa gán gì = dùng công thức theo loại bộ phận,
                 hoặc mặc định cố định nếu loại bộ phận cũng chưa cấu hình. -->
            <template #extra="{ mode }">
              <PdFormulaSection v-if="mode.id === PD_GROWTH_RATE_ID" :target-type="1" :target-id="props.componentId"/>
            </template>
          </threshold-tab>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="flex justify-between space-x-2">
        <cancel-button @click="emits('cancel')"></cancel-button>
        <el-button type="primary" @click="emits('save', thresholdList)">{{ t('machine.saveConfig') }}</el-button>
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
import ThresholdFilter from '@/views/category/machine-part/components/ThresholdFilter.vue'
import PdFormulaSection from '@/views/category/machine/components/PdFormulaSection.vue'
import { useConfigStore } from '@/store/modules/configStore'
import DrawerTitle from '@/components/Dialog/DrawerTitle.vue'

const { t } = useLang()

// ThresholdType.PdGrowthRate (7) / PdLevelDb (8) - xem Enums.cs (BE).
const PD_THRESHOLD_TYPE_IDS = [7, 8]
const PD_LEVEL_DB_ID = 8
const PD_GROWTH_RATE_ID = 7
const configStore = useConfigStore()
const allThresholdTypeOptions = computed(() => configStore.getConfig('thresholdTypeList') ?? [])
const thermalThresholdTypeOptions = computed(() =>
    allThresholdTypeOptions.value.filter((item: any) => !PD_THRESHOLD_TYPE_IDS.includes(item.id)),
)
// Tên hiển thị riêng cho 2 option PD - làm rõ đơn vị/cách so sánh ngay trong tên, tránh nhầm giữa 2 kiểu.
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
  tab: {
    type: String,
    default: 'gen'
  },
  // Id bộ phận đang sửa - undefined khi đang thêm mới (chưa lưu) - PdFormulaAssignmentPicker cần id thật
  // để gán/xem lịch sử công thức.
  componentId: {
    type: Number,
    required: false,
  },
  // Ngữ cảnh hiển thị trên tiêu đề: [tên thiết bị, tên bộ phận]
  crumbs: {
    type: Array<string | undefined | null>,
    default: () => [],
  },
})

const domainTab = ref<'thermal' | 'pd'>('thermal')
const thermalTabModel = ref(props.tab)
const pdTabModel = ref(props.tab)

// Không truyền ngưỡng kế thừa thì chỉ còn phần khai báo riêng
const hasInherited = computed(() => !!props.machinePartThresholdList)
const scopeOptions = computed(() => [
  { label: t('machine.inheritFromType'), value: 'gen' },
  { label: t('machine.customThreshold'), value: 'main' },
])

// Emits
const emits = defineEmits(['save', 'cancel', 'update:thresholdList'])

// Ensure temperatureThresholds is initialized for each mode
const thresholdListModel = ref<any[]>([])

const dialogOpen = () => {
  thresholdListModel.value = props.thresholdList
  domainTab.value = 'thermal'
  thermalTabModel.value = props.tab
  pdTabModel.value = props.tab
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

// Danh sách LOẠI đang chọn tách theo domain để 2 selector độc lập - sửa bên nào chỉ ghi đè đúng phần của
// domain đó trong thresholdListModel gộp chung, giữ nguyên phần domain còn lại.
const thermalSelectedTypes = computed<any[]>({
  get: () => thresholdListModel.value.filter((t: any) => !PD_THRESHOLD_TYPE_IDS.includes(t.id)),
  set: (val: any[]) => {
    thresholdListModel.value = [...val, ...thresholdListModel.value.filter((t: any) => PD_THRESHOLD_TYPE_IDS.includes(t.id))]
  },
})
// PD chỉ được chọn 1 trong 2 kiểu (ΔPD%/tháng HOẶC ngưỡng dB tuyệt đối, không dùng song song).
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
const thermalMachinePartThresholdList = computed(() => (props.machinePartThresholdList ?? []).filter((t: any) => !PD_THRESHOLD_TYPE_IDS.includes(t.id)))
const pdMachinePartThresholdList = computed(() => (props.machinePartThresholdList ?? []).filter((t: any) => PD_THRESHOLD_TYPE_IDS.includes(t.id)))
</script>

<style scoped>
.threshold-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.scope-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.threshold-domain-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.threshold-domain-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 600;
}
</style>
