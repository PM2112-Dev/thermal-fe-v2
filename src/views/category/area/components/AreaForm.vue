<template>
  <FormWrapper
      :form-model="formModel"
      :form-props="{ labelWidth: '160px', rules: userRules, labelPosition: isMobile ? 'top': 'left'}"
      :request-fn="isEditing ? editAreaApi : addAreaApi"
      :isEditing="isEditing"
      @success="handleSuccess"
      :transform-form-data="transformFormData"
  >
    <template v-slot="{ formErrors }">
      <el-form-item :label="t('area.province')" prop="provinceId" :error="formErrors.ProvinceId">
        <select-from-config
            v-model="formModel.provinceId"
            key-config="provinceList"
        />
      </el-form-item>
      <el-form-item :label="t('area.code')" prop="code" :error="formErrors.Code">
        <el-input v-model="formModel.code"/>
      </el-form-item>
      <el-form-item :label="t('area.name')" prop="name" :error="formErrors.Name">
        <el-input v-model="formModel.name"/>
      </el-form-item>
      <el-form-item :label="t('area.mapType')" prop="mapType" :error="formErrors.MapType">
        <select-from-config
            v-model="formModel.mapType"
            key-config="mapTypeList"
            colValue="code"
            @change="changeMapType"
        />
      </el-form-item>
      <template v-if="formModel.mapType === MAP_TYPE_PICTURE">
        <Suspense>
          <el-form-item prop="photoFile" :label="t('area.singleLineDiagram')" :error="formErrors.photoFile">
            <ImageUploader v-model="formModel.photoPath" @onfile="changePhotoFile"/>
          </el-form-item>
        </Suspense>
        <Suspense>
          <el-form-item prop="emapPhotoPath" :label="t('area.sitePlan')" :error="formErrors.emapPhotoPath">
            <GlbUploadButton
                :file-path="formModel.emapPhotoPath"
                :model-position="emapPosition?.modelPosition"
                :model-rotation="emapPosition?.modelRotation"
                :model-scale="emapPosition?.modelScale"
                :camera-position="emapPosition?.cameraPosition"
                :target="emapPosition?.target"
                @change-file="handleChangeLocalFile"
                @save-preview="handleSavePreview"
            />
          </el-form-item>
        </Suspense>
      </template>
      <el-form-item :label="t('area.parent')" prop="parentId" :error="formErrors.ParentId">
        <tree-select-remote
            v-model="formModel.parentId"
            :request-fn="getAllTreeAreaApi"
            clearable
        />
      </el-form-item>
      <el-form-item :label="t('map.coordinates')" :error="formErrors.Latitude ?? formErrors.Longitude">
        <div class="flex w-full">
          <LatLngPicker ref="mapPicker" :map-config="formModel" @input="setCoordinate"/>
          <div v-show="formModel.latitude && formModel.longitude" class="ml-4 w-full">
            <p class="w-full flex gap-2">
              <el-input class="w-full" v-model="formModel.longitude" readonly></el-input>
              <el-input class="w-full" v-model="formModel.latitude" readonly></el-input>
            </p>
          </div>
        </div>
      </el-form-item>

      <el-form-item :label="t('fields.note')" prop="note" :error="formErrors.Note">
        <el-input v-model="formModel.note"/>
      </el-form-item>
      <el-form-item :label="t('area.comparisonMode')" prop="comparationDataMode" :error="formErrors.ComparationDataMode">
        <select-from-config
            v-model="formModel.comparationDataMode"
            key-config="comparationDataModeList"
            col-value="code"
        ></select-from-config>
      </el-form-item>
      <el-form-item :label="t('area.ambientTemperature')" prop="environmentTemperature"
                    :error="formErrors.EnvironmentTemperature">
        <el-input-number
            v-model="formModel.environmentTemperature"
            :controls="false"
            :min="0"
            :max="100"
        ></el-input-number>
      </el-form-item>
      <el-form-item :label="t('fields.status')" prop="status" :error="formErrors.Status">
        <select-from-config
            key-config="userStatusList"
            v-model="formModel.status"
            col-value="code"
        />
      </el-form-item>
    </template>
  </FormWrapper>
</template>

<script setup lang="ts">
import { useLang } from '@/hooks/web/useI18n'
import FormWrapper from '@/components/Form/FormWrapper.vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import {computed, nextTick, ref, watch} from 'vue'
import {rule} from '@/utils/validate'
import {isFormEditing} from '@/utils/is'
import {FormRules} from 'element-plus'
import {addAreaApi, editAreaApi, getAllTreeAreaApi} from '@/api/area'
import TreeSelectRemote from '@/components/Tree/TreeSelectRemote.vue'
import LatLngPicker from '@/components/Map/LatLngPicker.vue'
import ImageUploader from '@/components/Input/ImageUploader.vue'
import {MAP_TYPE_PICTURE} from '@/constants'
import {buildFormData} from '@/utils/objectUtils'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()


const props = defineProps({
  formModel: {
    type: Object,
    required: true,
  },
})

const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
const mapPicker = ref<InstanceType<typeof LatLngPicker>>()

const pendingGlbFile = ref<File | null>(null)
const photoFile = ref<File | null>(null)

const changePhotoFile = (file) => {
  photoFile.value = file;
  if (!file) {
    updateFormModel({photoPath: null})
  }
}

function handleChangeLocalFile(payload: { file: File | null; localUrl: string; fileName: string }) {
  if (!payload.localUrl) {
    updateFormModel({emapPhotoPath: null})
  }
  pendingGlbFile.value = payload.file
}

function handleSavePreview(payload: {
  filePath: string
  modelPosition: { x: number; y: number; z: number }
  modelRotation: { x: number; y: number; z: number }
  modelScale: { x: number; y: number; z: number }
  cameraPosition: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
}) {
  updateFormModel({
    emapPosition: {
      modelPosition: payload.modelPosition,
      modelRotation: payload.modelRotation,
      modelScale: payload.modelScale,
      cameraPosition: payload.cameraPosition,
      target: payload.target,
    }
  })
}

// emapPosition lưu ở BE dạng chuỗi JSON: khi đọc cần parse, khi gửi cần stringify
const parseEmapPosition = (value: any) => {
  if (!value) return null
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return null }
}
const emapPosition = computed(() => parseEmapPosition(props.formModel?.emapPosition))

const transformFormData = (data: any) => {
  const position = parseEmapPosition(data.emapPosition)
  data.emapPosition = position ? JSON.stringify(position) : ""
  const formData = buildFormData(data);
  if (pendingGlbFile.value) {
    formData.append('emapFile', pendingGlbFile.value)
  }
  if (photoFile.value) {
    formData.append('photoFile', photoFile.value)
  }
  return formData;
}

watch(
    () => props.formModel,
    () => {
      nextTick(() => {
        mapPicker.value?.refresh() // Call refresh when 'formModel' changes
      })
    },
    {deep: true}, // Set deep to true if you want to watch nested properties
)

const emit = defineEmits(['update:formModel', 'success'])

const updateFormModel = (node: any) => {
  emit('update:formModel', {...props.formModel, ...node})
}
const changeMapType = () => {
  props.formModel.photoPath = null
}
const setCoordinate = (coordinate: any) => {
  updateFormModel(coordinate)
}
const isEditing = computed(() => {
  return isFormEditing(props.formModel)
})
const userRules = computed<FormRules>(() => {
  const rules: FormRules = {
    code: [rule('required', true), rule('min', 3)],
    name: [rule('required', true)],
    status: [rule('required', true, 'status')],
  }

  return rules
})
const handleSuccess = (data: any) => {
  emit('success', data)
}
</script>
