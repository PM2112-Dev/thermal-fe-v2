<template>
  <FormWrapper
    :form-model="formModel"
    :form-props="{ labelWidth: '150px', rules: formRules, labelPosition: appStore.isMobile ? 'top' : 'left' }"
    :request-fn="requestFn"
    :transform-form-data="transformFormData"
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
      <el-form-item :label="t('ai.model')" prop="modelCode" :error="formErrors.ModelCode">
        <el-select v-model="formModel.modelCode" clearable filterable>
          <el-option v-for="m in models" :key="m.code" :value="m.code" :label="`${m.name} (${m.code})`"/>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('ai.classes')" prop="classes" :error="formErrors.Classes">
        <el-select
          v-model="formModel.classes"
          multiple
          filterable
          allow-create
          default-first-option
          :placeholder="t('ai.allClasses')"
        >
          <el-option v-for="c in modelClasses" :key="c" :value="c" :label="c"/>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('ai.rule')" prop="ruleType" :error="formErrors.RuleType">
        <el-select v-model="formModel.ruleType">
          <el-option v-for="r in AI_RULE_TYPES" :key="r" :value="r" :label="t(`ai.rules.${r}`)"/>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('ai.alertType')" prop="alertType" :error="formErrors.AlertType">
        <el-input v-model="formModel.alertType" :placeholder="t('ai.alertTypePlaceholder')"/>
      </el-form-item>
      <el-form-item :label="t('ai.params')" prop="paramsText">
        <el-input v-model="formModel.paramsText" type="textarea" :rows="5" class="code-input"
                  placeholder='{"threshold": 0.6, "cooldownSeconds": 30}'/>
      </el-form-item>
      <el-form-item :label="t('ai.description')" prop="description" :error="formErrors.Description">
        <el-input v-model="formModel.description" type="textarea" :rows="3" maxlength="500" show-word-limit/>
      </el-form-item>
      <el-form-item :label="t('ai.enabled')" prop="enabled">
        <el-switch v-model="formModel.enabled"/>
      </el-form-item>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormRules } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import { addAiFeatureApi, AI_RULE_TYPES, editAiFeatureApi } from '@/api/ai'
import { rule } from '@/utils/validate'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const appStore = useAppStore()
const props = defineProps<{ formModel: Record<string, any>; models: any[]; isEditing: boolean }>()
const emit = defineEmits<(e: 'success', data: any) => void>()

// Chức năng AI được định danh bằng mã (không có id) nên bọc lại hàm gọi API
const requestFn = (...args: any[]) =>
  props.isEditing ? editAiFeatureApi(props.formModel.code, args[1]) : addAiFeatureApi(args[0])

const modelClasses = computed<string[]>(
  () => props.models.find((m) => m.code === props.formModel.modelCode)?.classes ?? [],
)

const parseParams = (text?: string) => {
  const value = (text ?? '').trim()
  if (!value) return {}
  const parsed = JSON.parse(value)
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object')
  return parsed
}

const formRules = computed<FormRules>(() => ({
  code: [rule('required', true, 'code')],
  name: [rule('required', true, 'name')],
  paramsText: [
    {
      validator: (_r: any, value: string, cb: (e?: Error) => void) => {
        try {
          parseParams(value)
          cb()
        } catch {
          cb(new Error(t('ai.paramsInvalid')))
        }
      },
      trigger: 'blur',
    },
  ],
}))

const transformFormData = (data: Record<string, any>) => {
  const { paramsText, ...rest } = data
  return { ...rest, params: parseParams(paramsText) }
}
</script>

<style scoped>
.code-input :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
</style>
