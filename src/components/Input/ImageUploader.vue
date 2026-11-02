<template>
  <el-upload class="mb-5" :show-file-list="false" :before-upload="handlePreview" accept="image/*">
    <el-button type="primary">{{ t('upload.uploadImage') }}</el-button>
  </el-upload>

  <div v-if="previewData" class="relative inline-block m-4">
    <img :src="previewData" alt="Preview" class="w-full max-w-[300px] rounded border border-gray-300"/>
    <el-button
        class="!absolute !top-1 !right-1 !p-1"
        @click="removeImage"
        type="info"
        :icon="Close"
        circle
    />
  </div>
</template>

<script setup>
import { useLang } from '@/hooks/web/useI18n'
import {ref, watch} from 'vue'
import {Close} from '@element-plus/icons-vue'

const { t } = useLang()

const props = defineProps({
  modelValue: String,
})

const emit = defineEmits(['update:modelValue', 'onfile'])

const previewData = ref(props.modelValue || null)

watch(
    () => props.modelValue,
    (val) => {
      previewData.value = val
    },
)

const handlePreview = (file) => {

  const reader = new FileReader()
  reader.onload = () => {
    previewData.value = reader.result
  }
  reader.readAsDataURL(file)
  emit("onfile", file)
  // Không có action nên chặn upload tự động (nếu không el-upload sẽ POST lên "#" và báo lỗi 404);
  // file được gửi cùng biểu mẫu khi bấm Lưu
  return false
}

const removeImage = () => {
  previewData.value = null
  emit("onfile", null)
}
</script>
