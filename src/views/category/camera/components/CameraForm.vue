<template>
  <FormWrapper
      :form-model="formModel"
      :form-props="{ labelWidth: '190px', rules: formRules, labelPosition: isMobile ? 'top' : 'left' }"
      :request-fn="isEditing ? editCameraApi : addCameraApi"
      :isEditing="isEditing"
      @success="handleSuccess"
      :transform-form-data="transformFormData"
      :visibleCloseDrawer="false"
  >
    <template v-slot="{ formErrors }">
      <el-row :gutter="30">
        <el-col :span="isMobile ? 24 : 12">
          <el-form-item :label="t('camera.code')" prop="code" :error="formErrors.Code">
            <el-input v-model="formModel.code"/>
          </el-form-item>
          <el-form-item :label="t('camera.function')" prop="cameraType" :error="formErrors.CameraType">
            <select-from-config
                key-config="cameraTypeList"
                v-model="formModel.cameraType"
                col-value="code"
            />
          </el-form-item>
          <el-form-item :label="t('fields.area')" prop="areaId" :error="formErrors.AreaId">
            <tree-select-remote
                v-model="formModel.areaId"
                :request-fn="getAllTreeAreaApi"
                filterable
                clearable
            />
          </el-form-item>
          <el-form-item
              :label="t('camera.checkFrequency')"
              prop="frequency"
              :error="formErrors.Frequency"
          >
            <input-number v-model="formModel.frequency"/>
          </el-form-item>
          <el-form-item
              v-show="formModel.cameraType === CAMERA_NORMAL_TYPE"
              :label="t('camera.integratedCamera')"
              prop="IntegratedCamId"
              :error="formErrors.IntegratedCamId"
          >
            <virtualized-select-from-url
                :request-fn="getAllCamerasApi"
                v-model="formModel.integratedCamId"
                col-value="id"
                col-label="name"
            />
          </el-form-item>
          <el-form-item label="Username" prop="username" :error="formErrors.Username">
            <el-input v-model="formModel.username" autocomplete="new-password"/>
          </el-form-item>
          <el-form-item label="password" prop="password" :error="formErrors.Password">
            <el-input v-model="formModel.password" type="password" autocomplete="new-password"/>
          </el-form-item>
        </el-col>
        <el-col :span="isMobile ? 24 : 12">
          <el-form-item :label="t('camera.name')" prop="name" :error="formErrors.Name">
            <el-input v-model="formModel.name"/>
          </el-form-item>
          <el-form-item
              :label="t('camera.type')"
              prop="ptzType"
              :error="formErrors.PtzType"
          >
            <select-from-config
                key-config="cameraPtzTypeList"
                v-model="formModel.ptzType"
                col-value="code"
            />
          </el-form-item>
          <el-form-item :label="t('camera.link')" prop="cameraLink" :error="formErrors.CameraLink">
            <el-input v-model="formModel.cameraLink"/>
          </el-form-item>
          <el-form-item
              :label="t('camera.ipLan')"
              prop="lanIpAddress"
              :error="formErrors.LanIpAddress"
          >
            <el-input v-model="formModel.lanIpAddress"/>
          </el-form-item>
          <el-form-item :label="t('camera.ipWan')" prop="cameraLink" :error="formErrors.WanIpAddress">
            <el-input v-model="formModel.wanIpAddress"/>
          </el-form-item>
          <el-form-item
              :label="t('camera.brand')"
              prop="brand"
              :error="formErrors.Brand"
          >
            <el-select v-model="formModel.brand" filterable class="brand-select" :loading="brandLoading">
              <el-option v-for="b in brands" :key="b.code" :label="b.name" :value="b.code">
                <div class="brand-option">
                  <span>{{ b.name }}</span>
                  <span :class="['brand-plugin', b.plugin?.active ? 'is-on' : '']">
                    {{ b.plugin ? (b.plugin.active ? 'plugin' : 'off') : '' }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="t('camera.channel')" prop="channel" :error="formErrors.Channel">
            <el-input-number v-model="formModel.channel" :min="1" :max="64" :controls="false" class="!w-full"/>
            <div class="field-hint">{{ t('camera.channelHint') }}</div>
          </el-form-item>
          <el-form-item
              :label="t('fields.status')"
              prop="status"
              :error="formErrors.Status"
          >
            <select-from-config
                key-config="commonStatusList"
                v-model="formModel.status"
                col-value="code"
            />
          </el-form-item>
          <el-form-item
              :label="t('camera.iecAddress')"
              prop="iecObjectAddress"
              :error="formErrors.IecObjectAddress"
          >
            <input-number v-model="formModel.iecObjectAddress"></input-number>
          </el-form-item>
        </el-col>
      </el-row>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import {computed, onMounted, ref} from 'vue'
import {rule} from '@/utils/validate'
import {FormRules} from 'element-plus'
import {getAllTreeAreaApi} from '@/api/area'
import {getCameraBrandsApi} from '@/api/camera-brand'
import {addCameraApi, editCameraApi, getAllCamerasApi} from '@/api/camera'
import InputNumber from '@/components/Input/InputNumber.vue'
import {CAMERA_NORMAL_TYPE, CAMERA_THERMAL_TYPE} from '@/constants'
import VirtualizedSelectFromUrl from "@/components/Selection/VirtualizedSelectFromUrl.vue";
import {removeAllObjectInObject} from "@/utils/objectUtils";
import TreeSelectRemote from "@/components/Tree/TreeSelectRemote.vue";
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()

const props = defineProps({
  formModel: {
    type: Object,
    required: true,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
})

// Hãng lấy từ danh mục hãng (kể cả hãng thêm qua plugin), không còn cố định theo enum
const brands = ref<any[]>([])
const brandLoading = ref(false)
onMounted(async () => {
  brandLoading.value = true
  try {
    brands.value = ((await getCameraBrandsApi()).data ?? []).filter((b: any) => b.status === 'Active')
  } finally {
    brandLoading.value = false
  }
})

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {
    code: [rule('required', true, 'code')],
    name: [rule('required', true, 'name')],
    areaId: [rule('required', true, 'areaId')],
    cameraType: [rule('required', true, 'cameraType')],
    cameraLink: [rule('required', true, 'cameraLink')],
    lanIpAddress: [rule('required', true, 'lanIpAddress')],
    wanIpAddress: [rule('required', true, 'wanIpAddress')],
  }
  if (props.formModel.cameraType === CAMERA_NORMAL_TYPE) {
    rules.integratedCamId = [rule('required', true, 'IntegratedCamId')]
  } else if (props.formModel.cameraType === CAMERA_THERMAL_TYPE) {
    rules.frequency = [rule('required', true, 'frequency')]
  }

  return rules
})
const transformFormData = (formData: any) => {
  return removeAllObjectInObject(formData)
}

const emit = defineEmits(['update:formModel', 'success'])
const handleSuccess = (data: any) => {
  emit('success', data)
}
</script>
<style scoped>
.brand-select {
  width: 100%;
}
.brand-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.brand-plugin {
  font-size: 11px;
  color: var(--text-sub);
}
.brand-plugin.is-on {
  color: var(--success);
  font-weight: 600;
}
.field-hint {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-sub);
}
</style>