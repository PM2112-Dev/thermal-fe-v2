<script setup lang="ts">
// Tiêu đề chung cho el-drawer (#header): đường dẫn ngữ cảnh + tên drawer
defineProps({
  title: {
    type: String,
    required: true,
  },
  // vd. ["Máy biến áp T1", "Cánh quạt 1"] - phần rỗng bị bỏ qua
  crumbs: {
    type: Array<string | undefined | null>,
    default: () => [],
  },
})
</script>

<template>
  <div class="drawer-title">
    <span class="drawer-title__icon">
      <slot name="icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </slot>
    </span>
    <div class="drawer-title__text">
      <div v-if="crumbs.some(Boolean)" class="drawer-title__crumbs">
        <template v-for="(crumb, index) in crumbs.filter(Boolean)" :key="index">
          <span v-if="index" class="drawer-title__sep">›</span>
          <span class="drawer-title__crumb">{{ crumb }}</span>
        </template>
      </div>
      <h3 class="drawer-title__title">{{ title }}</h3>
    </div>
  </div>
</template>

<style scoped>
.drawer-title {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.drawer-title__icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 14%, transparent);
}

.drawer-title__text {
  min-width: 0;
}

.drawer-title__crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.drawer-title__crumb {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-title__sep {
  opacity: 0.6;
}

.drawer-title__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-main);
}


@media (max-width: 768px) {
  .drawer-title__title {
    font-size: 16px;
  }
}
</style>
