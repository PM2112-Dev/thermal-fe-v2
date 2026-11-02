<template>
  <FormWrapper
    :form-model="formModel"
    :form-props="{ labelWidth: '140px', rules: formRules, labelPosition: appStore.isMobile ? 'top' : 'left' }"
    :request-fn="isEditing ? editCameraBrandApi : addCameraBrandApi"
    :isEditing="isEditing"
    @success="(data: any) => emit('success', data)"
  >
    <template v-slot="{ formErrors }">
      <el-alert v-if="formModel.builtIn" class="mb-4" type="info" :closable="false" show-icon
                :title="t('cameraBrand.builtInHint')"/>
      <el-form-item :label="t('cameraBrand.code')" prop="code" :error="formErrors.Code">
        <el-input v-model="formModel.code" :disabled="formModel.builtIn"/>
        <div class="field-hint">{{ t('cameraBrand.codeHint') }}</div>
      </el-form-item>
      <el-form-item :label="t('cameraBrand.name')" prop="name" :error="formErrors.Name">
        <el-input v-model="formModel.name"/>
      </el-form-item>
      <el-form-item :label="t('cameraBrand.description')" prop="description" :error="formErrors.Description">
        <el-input v-model="formModel.description" type="textarea" :rows="3" maxlength="500" show-word-limit/>
      </el-form-item>
      <el-form-item :label="t('fields.status')" prop="status" :error="formErrors.Status">
        <select-from-config key-config="commonStatusList" v-model="formModel.status" col-value="code"/>
      </el-form-item>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormRules } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import { addCameraBrandApi, editCameraBrandApi } from '@/api/camera-brand'
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
</script>

<style scoped>
.field-hint {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-sub);
}
</style>
