<template>
  <FormWrapper
    :form-model="formModel"
    :form-props="{ labelWidth: '150px', rules: formRules, labelPosition: appStore.isMobile ? 'top' : 'left' }"
    :request-fn="isEditing ? editAiModelApi : addAiModelApi"
    :isEditing="isEditing"
    @success="(data: any) => emit('success', data)"
  >
    <template v-slot="{ formErrors }">
      <el-form-item :label="t('ai.code')" prop="code" :error="formErrors.Code">
        <el-input v-model="formModel.code" :disabled="isEditing"/>
      </el-form-item>
      <el-form-item :label="t('ai.name')" prop="name" :error="formErrors.Name">
        <el-input v-model="formModel.name"/>
      </el-form-item>
      <el-form-item :label="t('ai.weightsPath')" prop="weightsPath" :error="formErrors.WeightsPath">
        <div class="weights-row">
          <el-select
            v-model="formModel.weightsPath"
            filterable
            allow-create
            clearable
            default-first-option
            :loading="filesLoading"
            :placeholder="t('ai.weightsPlaceholder')"
            @visible-change="(open: boolean) => open && loadFiles()"
          >
            <el-option v-for="f in files" :key="f" :label="f" :value="f"/>
          </el-select>
          <el-button :disabled="!formModel.weightsPath" :loading="inspecting" @click="inspect">
            {{ t('ai.inspect') }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item :label="t('ai.taskType')" prop="taskType" :error="formErrors.TaskType">
        <el-radio-group v-model="formModel.taskType">
          <el-radio-button value="detect">{{ t('ai.taskDetect') }}</el-radio-button>
          <el-radio-button value="segment">{{ t('ai.taskSegment') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('ai.classes')" prop="classes" :error="formErrors.Classes">
        <el-select
          v-model="formModel.classes"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          :placeholder="t('ai.classesPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('ai.confidence')" prop="confidence" :error="formErrors.Confidence">
        <div class="confidence-row">
          <el-slider v-model="formModel.confidence" :min="0.05" :max="0.95" :step="0.05" show-input
                     :show-input-controls="false"/>
        </div>
      </el-form-item>
      <el-form-item :label="t('ai.description')" prop="description" :error="formErrors.Description">
        <el-input v-model="formModel.description" type="textarea" :rows="3" maxlength="500" show-word-limit/>
      </el-form-item>
      <el-form-item :label="t('fields.status')" prop="status" :error="formErrors.Status">
        <select-from-config key-config="commonStatusList" v-model="formModel.status" col-value="code"/>
      </el-form-item>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, type FormRules } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import { addAiModelApi, editAiModelApi, getAiModelFilesApi, inspectAiModelApi } from '@/api/ai'
import { isFormEditing } from '@/utils/is'
import { rule } from '@/utils/validate'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const appStore = useAppStore()
const props = defineProps<{ formModel: Record<string, any> }>()
const emit = defineEmits<(e: 'success', data: any) => void>()

const isEditing = computed(() => isFormEditing(props.formModel))
const formRules = computed<FormRules>(() => ({
  code: [rule('required', true, 'code')],
  name: [rule('required', true, 'name')],
}))

const files = ref<string[]>([])
const filesLoading = ref(false)
const loadFiles = async () => {
  filesLoading.value = true
  try {
    files.value = (await getAiModelFilesApi()).data ?? []
  } catch {
    files.value = []
  } finally {
    filesLoading.value = false
  }
}

// Đọc loại tác vụ và danh sách đối tượng ngay từ file trọng số trên server AI
const inspecting = ref(false)
const inspect = async () => {
  inspecting.value = true
  try {
    const info = (await inspectAiModelApi(props.formModel.weightsPath)).data
    if (info?.task) props.formModel.taskType = String(info.task).toLowerCase().includes('seg') ? 'segment' : 'detect'
    if (info?.classes?.length) props.formModel.classes = info.classes
    ElMessage.success(t('ai.inspectDone'))
  } finally {
    inspecting.value = false
  }
}
</script>

<style scoped>
.weights-row {
  display: flex;
  width: 100%;
  gap: 8px;
}
.weights-row :deep(.el-select) {
  flex: 1;
}
.confidence-row {
  width: 100%;
  padding: 0 8px;
}
</style>
