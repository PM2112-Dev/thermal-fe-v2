<script setup lang="ts">
import { computed } from 'vue'
import { useLang } from '@/hooks/web/useI18n'
import InputNumber from '@/components/Input/InputNumber.vue'
import { isUnboundedLevel } from '@/views/category/machine/components/levels'

const { t } = useLang()
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  fromModel: [String, Number],
  readonly: {
    type: Boolean,
    default: false,
  },
  unit: {
    type: String,
    default: '°C',
  },
  invalid: {
    type: Boolean,
    default: false,
  },
})

const toModel = defineModel<number | string | undefined>('toModel', { required: true })

// Mức 4 không có trần - hiển thị +∞, không cho nhập
const unbounded = computed(() => isUnboundedLevel(props.item.level))

const step = 1
const increase = () => {
  if (props.readonly) return
  toModel.value = Number(toModel.value ?? 0) + step
}

const decrease = () => {
  if (props.readonly) return
  toModel.value = Math.max(Number(toModel.value ?? 0) - step, 0)
}
</script>

<template>
  <div class="level-block" :class="['lvl-' + item.level, { 'is-invalid': invalid }]">
    <div class="level-info">
      <div class="lvl-icon" v-html="item.icon"></div>
      <div class="lvl-text">
        <h4>{{ t(item.labelKey) }}</h4>
        <p>{{ t(item.noteKey) }}</p>
      </div>
    </div>

    <div class="level-range">
      <div class="rng-field">
        <span class="rng-label">{{ t('machine.from') }}</span>
        <div class="rng-static">
          <span v-if="item.fromText" class="rng-op">{{ item.fromText }}</span>
          <span class="rng-num">{{ fromModel ?? 0 }}</span>
          <span class="rng-unit">{{ unit }}</span>
        </div>
      </div>

      <span class="rng-arrow">→</span>

      <div class="rng-field">
        <span class="rng-label">{{ t('machine.to') }}</span>
        <!-- "∞" dùng SVG: glyph ∞ của font lệch baseline so với "+" và số -->
        <div v-if="unbounded" class="rng-static rng-infinity" :title="t('machine.noLimit')">
          <span class="rng-num">+</span>
          <svg class="rng-infinity__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"></path>
          </svg>
          <span class="rng-unit">{{ unit }}</span>
        </div>
        <div v-else class="rng-stepper">
          <button type="button" class="btn-step" :disabled="readonly" @click="decrease">−</button>
          <span class="rng-op">≤</span>
          <input-number v-model="toModel" class="rng-input" :readonly="readonly" />
          <span class="rng-unit">{{ unit }}</span>
          <button type="button" class="btn-step" :disabled="readonly" @click="increase">+</button>
        </div>
      </div>
    </div>

    <p v-if="invalid" class="rng-error">{{ t('machine.invalidRange') }}</p>
  </div>
</template>

<style scoped>
.level-block {
  --lvl-color: var(--primary);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 14px 18px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-left: 4px solid var(--lvl-color);
  border-radius: 10px;
  background: var(--bg-card);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.level-block:hover {
  box-shadow: var(--shadow);
}

.level-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 200px;
}

.lvl-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--lvl-color);
  background: color-mix(in srgb, var(--lvl-color) 14%, transparent);
}

.lvl-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.lvl-text h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--lvl-color);
}

.lvl-text p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-sub);
}

.level-range {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.rng-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rng-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-sub);
}

.rng-static,
.rng-stepper {
  display: flex;
  align-items: center;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-body);
}

.rng-static {
  gap: 4px;
  min-width: 96px;
  padding: 0 12px;
  justify-content: center;
}

.rng-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.rng-op,
.rng-unit {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

/* Cùng khung với ô "Từ", hiển thị +∞ - không nhập được */
.rng-infinity {
  min-width: 190px;
  gap: 2px;
  cursor: default;
}

.rng-infinity .rng-num {
  line-height: 1;
}

.rng-infinity__icon {
  flex-shrink: 0;
  color: var(--text-main);
}

.rng-infinity .rng-unit {
  margin-left: 4px;
}

.rng-arrow {
  height: 36px;
  display: flex;
  align-items: center;
  color: var(--text-sub);
  opacity: 0.6;
}

.rng-stepper {
  width: 190px;
  overflow: hidden;
}

.rng-stepper:focus-within {
  border-color: var(--lvl-color);
}

.rng-stepper .rng-op {
  padding-left: 6px;
}

.rng-stepper .rng-unit {
  padding-right: 6px;
}

.rng-input {
  flex: 1;
  min-width: 0;
}

.rng-input :deep(.el-input__wrapper) {
  padding: 0 4px;
  background: transparent;
  box-shadow: none !important;
}

.rng-input :deep(.el-input__inner) {
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main);
}

.btn-step {
  width: 34px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-sub);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn-step:hover:not(:disabled) {
  background: color-mix(in srgb, var(--lvl-color) 15%, transparent);
  color: var(--lvl-color);
}

.btn-step:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.rng-error {
  flex-basis: 100%;
  margin: 0;
  font-size: 12px;
  color: var(--danger);
  text-align: right;
}

.is-invalid .rng-stepper {
  border-color: var(--danger);
}

.lvl-1 {
  --lvl-color: #10b981;
}

.lvl-2 {
  --lvl-color: #3b82f6;
}

.lvl-3 {
  --lvl-color: #f59e0b;
}

.lvl-4 {
  --lvl-color: #ef4444;
}

@media (max-width: 768px) {
  .level-range {
    width: 100%;
  }

  .rng-field {
    flex: 0 0 auto;
  }

  .rng-field:last-child {
    flex: 1;
    min-width: 0;
  }

  .rng-static {
    min-width: 80px;
    padding: 0 8px;
  }

  .rng-stepper,
  .rng-field:last-child .rng-static {
    width: 100%;
    min-width: 0;
  }

  .rng-stepper .rng-op {
    display: none;
  }

  .rng-input {
    min-width: 40px;
  }

  .rng-error {
    text-align: left;
  }
}
</style>
