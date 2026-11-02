<script setup lang="ts">
import { ref } from 'vue'
import { useLang } from '@/hooks/web/useI18n'
import PdFormulaAssignmentPicker from '@/views/category/machine/components/PdFormulaAssignmentPicker.vue'

// Khung thu gọn chứa PdFormulaAssignmentPicker - phần phụ so với 4 mức ngưỡng nên mặc định đóng
defineProps<{
  /** FormulaAssignmentTargetType: 1 = MachineComponent, 2 = MachinePart (Enums.cs). */
  targetType: number
  targetId?: number
}>()

const { t } = useLang()
const open = ref(false)
</script>

<template>
  <section class="pd-formula" :class="{ 'is-open': open }">
    <button type="button" class="pd-formula__head" @click="open = !open">
      <span class="pd-formula__icon">ƒ</span>
      <span class="pd-formula__text">
        <span class="pd-formula__title">{{ t('formula.assignment.title') }}</span>
      </span>
      <svg class="pd-formula__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
    <div v-show="open" class="pd-formula__body">
      <PdFormulaAssignmentPicker :target-type="targetType" :target-id="targetId" embedded/>
    </div>
  </section>
</template>

<style scoped>
.pd-formula {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
}

.pd-formula__head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.pd-formula__icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
  font-style: italic;
  font-weight: 700;
  color: #a78bfa;
  background: rgba(167, 139, 250, 0.14);
}

.pd-formula__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pd-formula__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}

.pd-formula__chevron {
  flex-shrink: 0;
  color: var(--text-sub);
  transition: transform 0.2s;
}

.is-open .pd-formula__chevron {
  transform: rotate(180deg);
}

.pd-formula__body {
  padding: 14px 16px 16px;
  border-top: 1px solid var(--border);
}
</style>
