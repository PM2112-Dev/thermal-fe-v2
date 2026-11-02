<template>
  <div class="container main-container">
    <div class="camera-setting">
      <div class="setting-head">
        <div class="setting-title-group">
          <button type="button" class="setting-back" :title="t('common.back')" :aria-label="t('common.back')" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <div class="setting-title">
            <div class="setting-name">{{ camera?.name }}</div>
            <div class="setting-hint">{{ t('camera.setupSourceHint') }}</div>
          </div>
        </div>
        <label class="setting-source">
          <span>{{ t('camera.setupSource') }}</span>
          <el-select v-model="source" class="setting-source__select">
            <el-option :value="0" :label="t('camera.setupSourceAuto')" />
            <el-option :value="1" :label="t('camera.setupSourceBrand')" />
            <el-option :value="2" :label="t('camera.setupSourceOnvif')" />
          </el-select>
        </label>
      </div>

      <el-tabs v-model="activeName" type="border-card">
        <!-- Chỉ render tab đang mở để không chạy 2 luồng video cùng lúc -->
        <el-tab-pane :label="t('camera.presetTourTab')" name="1">
          <camera-preset-tour-manager
              v-if="camera && activeName === '1'"
              :camera="camera"
              :source="source"
              @edit-zones="openZoneEditor"
          />
        </el-tab-pane>
        <el-tab-pane :label="t('camera.thermalZoneTab')" name="2">
          <camera-thermal-area-editor
              v-if="camera && activeName === '2'"
              :camera="camera"
              :preset-id="zonePresetId"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from "vue-router";
import { ArrowLeft } from '@element-plus/icons-vue'
import CameraPresetTourManager from "@/views/category/camera/components/CameraPresetTourManager.vue";
import CameraThermalAreaEditor from "@/views/category/camera/components/CameraThermalAreaEditor.vue";
import {getCameraDetailApi} from "@/api/camera";

// Quản lý góc quay, tour và vùng đo nhiệt theo cách của forest: mọi thay đổi ghi TRỰC TIẾP lên camera qua plugin
// (API hãng hoặc ONVIF), backend đồng bộ lại từ camera rồi trả danh sách mới — camera là nguồn chuẩn, không phải DB.
const { t } = useLang()

const activeName = ref("1")
const route = useRoute()
const router = useRouter()
const cameraId = route.params.id as string

// Mở thẳng bằng link (không có lịch sử) thì về danh sách camera
const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'camera_list' })
}

// PtzSetupSource: 0 = Auto, 1 = API hãng, 2 = ONVIF
const source = ref(0)

const camera = ref<any>(null)
onMounted(async () => {
  camera.value = (await getCameraDetailApi(cameraId)).data
})

// Góc quay mở sẵn khi chuyển sang tab vùng đo từ nút "Vùng đo" của một preset
const zonePresetId = ref<number | null>(null)
const openZoneEditor = (preset: any) => {
  zonePresetId.value = preset.presetId
  activeName.value = '2'
}
</script>

<style scoped>
.setting-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  margin-bottom: 14px;
}
.setting-title-group { display: flex; align-items: center; gap: 12px; min-width: 0; }
.setting-back {
  display: grid;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-sub);
  font-size: 16px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.setting-back:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.setting-back:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.setting-title { min-width: 0; }
.setting-name { font-size: 16px; font-weight: 700; line-height: 1.3; }
.setting-hint { margin-top: 2px; font-size: 12px; color: var(--text-sub); }
.setting-source { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-sub); }
.setting-source__select { width: 240px; }
@media (max-width: 520px) {
  .setting-source { width: 100%; }
  .setting-source__select { flex: 1; width: auto; }
}
</style>
