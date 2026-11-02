<template>
  <div class="threshold-tab">
    <!-- Hàng trên: chuyển loại ngưỡng (chỉ khi có từ 2 loại) + bộ chọn loại ngưỡng ở góc phải -->
    <div v-if="thresholdList.length > 1 || $slots.toolbar" class="threshold-topbar">
      <div class="type-tabs">
        <template v-if="thresholdList.length > 1">
          <!-- Ẩn scrollbar, cuộn bằng nút ‹ › (giống el-tabs) hoặc lăn chuột -->
          <button v-show="canScrollLeft" type="button" class="tabs-arrow is-left" @click="scrollTabs(-1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div ref="pillsRef" class="type-pills" @scroll="updateArrows" @wheel="onTabsWheel">
            <button
                v-for="(mode, indexMode) in thresholdList"
                :key="indexMode"
                type="button"
                class="type-pill"
                :class="{ 'is-active': indexMode === activeName }"
                @click="selectMode(indexMode, $event)"
            >{{ labelOf(mode) }}</button>
          </div>
          <button v-show="canScrollRight" type="button" class="tabs-arrow is-right" @click="scrollTabs(1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </template>
      </div>
      <div v-if="$slots.toolbar" class="threshold-toolbar">
        <slot name="toolbar"></slot>
      </div>
    </div>

    <template v-if="activeMode">
      <!-- Tiêu đề phần đang sửa: domain › phạm vi khai báo, tên loại ngưỡng, đơn vị -->
      <div class="threshold-heading">
        <div class="min-w-0">
          <div v-if="context.length" class="heading-crumb">
            <template v-for="(crumb, indexCrumb) in context" :key="indexCrumb">
              <span v-if="indexCrumb" class="crumb-sep">›</span>
              <span>{{ crumb }}</span>
            </template>
          </div>
          <h3 class="heading-title">{{ labelOf(activeMode) }}</h3>
        </div>
        <div class="heading-side">
          <!-- Kiểu "So với ngưỡng": giá trị ngưỡng gốc để tính chênh lệch -->
          <label v-if="activeMode.code === 'Threshold'" class="heading-threshold">
            <span>{{ t('machine.temperatureThreshold') }}</span>
            <input-number v-model="activeMode.threshold" :readonly="readonly" class="heading-threshold__input"/>
            <span>{{ unitOf(activeMode) }}</span>
          </label>
          <span v-if="readonly" class="heading-badge is-muted">{{ t('machine.readonlyBadge') }}</span>
          <span class="heading-badge">{{ t('machine.unitLabel', { unit: unitOf(activeMode) }) }}</span>
        </div>
      </div>

      <!-- Thanh tổng quan 4 mức: nhìn nhanh các mốc chuyển mức, mức 4 kéo dài tới +∞ -->
      <div class="threshold-scale">
        <div class="scale-bar">
          <span v-for="level in defaultLevels" :key="level.level" :class="['scale-seg', 'seg-' + level.level]"></span>
        </div>
        <div class="scale-ticks">
          <span
              v-for="(tick, indexTick) in ticksOf(activeMode)"
              :key="indexTick"
              class="scale-tick"
              :style="{ left: `${indexTick * 25}%` }"
          >{{ tick }}</span>
        </div>
      </div>

      <div class="level-list">
        <AlertRange
            v-for="(level, indexLevel) in levelsOf(activeMode)"
            :key="`${activeName}_${indexLevel}`"
            v-model:toModel="activeMode.temperatureThresholds[indexLevel].maxTemperature"
            :fromModel="fromOf(activeMode, indexLevel)"
            :item="level"
            :unit="unitOf(activeMode)"
            :readonly="readonly"
            :invalid="isInvalid(activeMode, indexLevel)"
        />
      </div>

      <slot name="extra" :mode="activeMode"></slot>
    </template>

    <el-empty v-else :image-size="64" :description="t('machine.noThresholdType')"/>
  </div>
</template>
<script setup lang="ts">
import { enumLabel } from '@/utils/enumLabel'
import { useLang } from '@/hooks/web/useI18n'
import AlertRange from "@/views/category/machine/components/AlertRange.vue";
import InputNumber from "@/components/Input/InputNumber.vue";
import {computed, nextTick, onBeforeUnmount, ref, watch} from "vue";
import {applyUnboundedMax, defaultLevels, isUnboundedLevel} from "@/views/category/machine/components/levels";
import {TEMPERATURE_LEVEL_GOOD} from "@/constants";

const { t } = useLang()

const activeName = ref(0)

const props = defineProps({
  thresholdList: {
    type: Array<any>,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false
  },
  // Đường dẫn hiển thị ở tiêu đề, vd. ["Ngưỡng nhiệt độ", "Khai báo riêng"]
  context: {
    type: Array<string>,
    default: () => [],
  },
})

const activeMode = computed(() => props.thresholdList[activeName.value])

// Mức 4 luôn là +∞ - sửa luôn dữ liệu cũ còn trần nhập tay để lần lưu tới ghi đúng xuống BE.
watch(
    () => props.thresholdList,
    (list) => {
      list?.forEach(applyUnboundedMax)
      // Bỏ chọn bớt loại ngưỡng thì loại đang mở có thể không còn - quay về loại đầu
      if (activeName.value >= (list?.length ?? 0)) activeName.value = 0
    },
    { immediate: true, deep: true },
)

// --- Hàng tab cuộn ngang ---
const pillsRef = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateArrows() {
  const el = pillsRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollTabs(direction: number) {
  const el = pillsRef.value
  el?.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' })
}

// Chuột chỉ có lăn dọc - đổi sang cuộn ngang khi trỏ vào hàng tab
function onTabsWheel(event: WheelEvent) {
  const el = pillsRef.value
  if (!el || el.scrollWidth <= el.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  event.preventDefault()
  el.scrollLeft += event.deltaY
}

const resizeObserver = new ResizeObserver(updateArrows)
watch(pillsRef, (el, oldEl) => {
  if (oldEl) resizeObserver.unobserve(oldEl)
  if (el) resizeObserver.observe(el)
})
watch(() => props.thresholdList.length, () => nextTick(updateArrows))
onBeforeUnmount(() => resizeObserver.disconnect())

// Tab bị che một phần khi hàng tab đang cuộn ngang - kéo vào giữa cho thấy trọn
function selectMode(index: number, event: MouseEvent) {
  activeName.value = index
  ;(event.currentTarget as HTMLElement)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

function labelOf(mode: any) {
  return enumLabel('thresholdTypeList', mode.code, mode.name)
}

// ThresholdType.PdGrowthRate (7) = %, PdLevelDb (8) = dB, còn lại (nhiệt độ) = °C - xem Enums.cs (BE).
const PD_GROWTH_RATE_ID = 7
const PD_LEVEL_DB_ID = 8
function unitOf(mode: any) {
  if (mode.id === PD_GROWTH_RATE_ID) return '%'
  if (mode.id === PD_LEVEL_DB_ID) return 'dB'
  return '°C'
}
// Mức "Tốt" ghi "Nhiệt độ bình thường" - không đúng ngữ cảnh PD, đổi thành "Tình trạng bình thường".
function levelsOf(mode: any) {
  if (mode.id !== PD_GROWTH_RATE_ID && mode.id !== PD_LEVEL_DB_ID) return defaultLevels
  return defaultLevels.map((level) =>
    level.level === TEMPERATURE_LEVEL_GOOD ? { ...level, noteKey: 'machine.levels.normalCondition' } : level,
  )
}

function fromOf(mode: any, indexLevel: number) {
  return indexLevel === 0 ? 0 : mode.temperatureThresholds[indexLevel - 1]?.maxTemperature
}

// Mức 1 được phép "đến 0" (ΔPD% mặc định mức Tốt = 0%), các mức sau phải lớn hơn mốc trước.
function isInvalid(mode: any, indexLevel: number) {
  const threshold = mode.temperatureThresholds[indexLevel]
  if (!threshold || isUnboundedLevel(threshold.level)) return false
  if (threshold.maxTemperature == null) return true
  return indexLevel > 0 && threshold.maxTemperature <= (fromOf(mode, indexLevel) ?? 0)
}

function ticksOf(mode: any) {
  const unit = unitOf(mode)
  const bounds = (mode.temperatureThresholds ?? [])
      .filter((threshold: any) => !isUnboundedLevel(threshold.level))
      .map((threshold: any) => `${threshold.maxTemperature ?? '?'}${unit}`)
  return [`0${unit}`, ...bounds, '+∞']
}

</script>
<style scoped lang="scss">
.threshold-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// Hàng tab loại ngưỡng: 1 hàng ngang, nhiều loại thì cuộn ngang; toolbar cố định bên phải
.threshold-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.type-tabs {
  position: relative;
  flex: 1;
  min-width: 0;
}

.type-pills {
  display: flex;
  gap: 22px;
  overflow-x: auto;
  overflow-y: hidden;
  // Ẩn hẳn scrollbar (Chrome 121+ ưu tiên scrollbar-width hơn ::-webkit-scrollbar)
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.type-pill {
  flex-shrink: 0;
  padding: 8px 0 10px;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s, box-shadow 0.15s;

  &:hover {
    color: var(--primary);
  }

  // Gạch chân bằng box-shadow để không làm hàng tab tràn theo chiều dọc
  &.is-active {
    color: var(--primary);
    box-shadow: inset 0 -2px 0 var(--primary);
  }
}

// Nút ‹ › nổi trên mép hàng tab, nền mờ dần để chữ bị che không bị cắt cụt
.tabs-arrow {
  position: absolute;
  top: 0;
  bottom: 2px;
  z-index: 1;
  width: 36px;
  display: flex;
  align-items: center;
  border: none;
  color: var(--text-sub);
  cursor: pointer;

  &:hover {
    color: var(--primary);
  }

  &.is-left {
    left: 0;
    justify-content: flex-start;
    background: linear-gradient(to right, var(--bg-card) 55%, transparent);
  }

  &.is-right {
    right: 0;
    justify-content: flex-end;
    background: linear-gradient(to left, var(--bg-card) 55%, transparent);
  }
}

.threshold-toolbar {
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .threshold-topbar {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 6px;
  }

  .threshold-toolbar {
    margin-left: 0;
  }
}

.threshold-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 6%, transparent);
}

.heading-crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--text-sub);
}

.crumb-sep {
  opacity: 0.6;
}

.heading-title {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.heading-side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.heading-threshold {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.heading-threshold__input {
  width: 80px;
}

.heading-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, transparent);

  &.is-muted {
    color: var(--text-sub);
    background: color-mix(in srgb, var(--text-sub) 14%, transparent);
  }
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-list :deep(.level-block) {
  margin-bottom: 0;
}

.threshold-scale {
  padding: 0 4px;
}

.scale-bar {
  display: flex;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  gap: 2px;
}

.scale-seg {
  flex: 1;
}

.seg-1 { background: #10b981; }
.seg-2 { background: #3b82f6; }
.seg-3 { background: #f59e0b; }
.seg-4 { background: linear-gradient(90deg, #ef4444, rgba(239, 68, 68, 0.25)); }

.scale-ticks {
  position: relative;
  height: 18px;
  margin-top: 4px;
}

.scale-tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-sub);

  &:first-child {
    transform: none;
  }

  &:last-child {
    transform: translateX(-100%);
  }
}
</style>
