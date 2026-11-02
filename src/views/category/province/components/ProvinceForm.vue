<template>
  <FormWrapper
    :form-model="formModel"
    :form-props="{ labelWidth: '140px', labelPosition: appStore.isMobile ? 'top' : 'left' }"
    :request-fn="isEditing ? editProvinceApi : addProvinceApi"
    :isEditing="isEditing"
    @success="handleSuccess"
  >
    <template v-slot="{ formErrors }">
      <el-form-item :label="t('province.code')" prop="code" :error="formErrors.Code">
        <el-input v-model="formModel.code" maxlength="50" />
      </el-form-item>
      <el-form-item :label="t('province.name')" prop="name" :error="formErrors.Name">
        <el-input v-model="formModel.name" maxlength="200" />
      </el-form-item>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import { computed } from 'vue'
import { isFormEditing } from '@/utils/is'
import { addProvinceApi, editProvinceApi } from '@/api/province'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const appStore = useAppStore()
const props = defineProps({
  formModel: {
    type: Object,
    required: true,
  },
})

const isEditing = computed(() => isFormEditing(props.formModel))
const emit = defineEmits<(e: 'success', data: any) => void>()
const handleSuccess = (data: any) => {
  emit('success', data)
}
</script>
