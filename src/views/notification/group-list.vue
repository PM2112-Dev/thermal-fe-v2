<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import {TableColumn} from '@/components/Table'
import {useLang} from '@/hooks/web/useI18n'
import {computed, nextTick, ref} from 'vue'
import BaseDialog from '@/components/Dialog/BaseDialog.vue'
import {STATUS_ACTIVE} from '@/constants'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import { deleteNotificationGroupApi, getNotificationGroupListApi} from '@/api/notification-group'
import NotificationGroupForm from '@/views/notification/components/NotificationGroupForm.vue'
import { getAllNotificationChannelApi} from '@/api/notification-channel'
import VirtualizedSelectFromUrl from '@/components/Selection/VirtualizedSelectFromUrl.vue'
import {getAllWarningEventApi} from '@/api/warning-event'
import {joinFieldValues} from '@/utils/stringUtils'
import {getAllTreeAreaApi} from '@/api/area'
import TreeSelectRemote from '@/components/Tree/TreeSelectRemote.vue'
import SearchButton from "@/components/Button/SearchButton.vue";
import GroupCard from "@/views/notification/components/GroupCard.vue";
import { useAppStore } from '@/store/modules/app'

const {t} = useLang()
const { hasAction } = usePermission()

const columns = computed<TableColumn[]>(() => [
  {label: 'STT', type: 'index', width: '60'},
  {prop: 'name', label: t('alertSetting.group.name')},
  {
    label: t('alertSetting.group.channel'),
    prop: 'notificationChannels',
    slots: {
      default: (scope: any) => (
          <span>{joinFieldValues(scope.row.notificationChannels, 'name')}</span>
      ),
    },
  },
  {
    label: t('alertSetting.group.events'),
    prop: 'events',
    slots: {
      default: (scope: any) => <span>{joinFieldValues(scope.row.events, 'name')}</span>,
    },
  },
  {
    prop: 'displayStatus',
    width: 140,
    label: t('fields.status'),
    slots: {
      default: ({row}) => (<span   style={{
        color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)'
      }}>{enumLabel('notificationGroupStatusList', row?.groupStatusObject?.code, row?.groupStatusObject?.name)}</span>)
    },
  },
  {
    label: t('fields.action'),
    width: '110px',
    slots: {
      default: (scope: any) => (
          <div>
            <EditCircleButton onClick={() => openDialogEdit(scope)}></EditCircleButton>
            <DeleteCircleButton onClick={() => openDelete(scope)}></DeleteCircleButton>
          </div>
      ),
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()

const formModel = ref({})

const openDialogAdd = () => {
  formModel.value = {
    status: STATUS_ACTIVE,
  }
  nextTick(() => {
    dialogVisible.value = true
  })
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}

const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteNotificationGroupApi, scope.row.id)
}

const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}
const cameraRef = ref<InstanceType<typeof VirtualizedSelectFromUrl>>()
const changeAreaId = (searchParams: GenericObject) => {
  searchParams['cameras'] = null
  cameraRef?.value?.fetch()
}
const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <list-template
      :show-btn-add="hasAction('notification-group', 'create')"
      :title="t('alertSetting.group.listTitle')"
      ref="elTableRef"
      key-list="group-list"
      :columns="columns"
      :use-table-config="{
        fetchDataApi: getNotificationGroupListApi,
      }"
      :search-props="{
        className: ''
      }"
      @addHandler="openDialogAdd"
      :card-component="GroupCard"
      @edit="openDialogEdit"
      @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams, tableMethods }">
      <div class="filter-row">
        <div class="filter-item">
          <div class="filter-label">{{ t('alertSetting.group.name') }}</div>
          <el-input v-model="searchParams.name" clearable class="filter-input" :placeholder="t('alertSetting.group.namePlaceholder')"/>
        </div>
        <div class="filter-item">
          <div class="filter-label">{{ t('alertSetting.group.channel') }}</div>
          <virtualized-select-from-url
              :request-fn="getAllNotificationChannelApi"
              v-model="searchParams.notificationChannels"
              class="filter-input"
              clearable
              :filterable="true"
          />
        </div>
        <div class="filter-item">
          <div class="filter-label">{{ t('alertSetting.group.events') }}</div>
          <virtualized-select-from-url
              :request-fn="getAllWarningEventApi"
              v-model="searchParams.events"
              clearable
              class="filter-input"
          />
        </div>
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.area') }}</div>
          <tree-select-remote
              v-model="searchParams.areaId"
              :request-fn="getAllTreeAreaApi"
              filterable
              clearable
              @change="
              () => {
                changeAreaId(searchParams)
              }
            "
              class="filter-input"
          />
        </div>
        <search-button @click="tableMethods?.refresh()"/>
      </div>
    </template>
  </list-template>
  <base-dialog v-model="dialogVisible" :destroy-on-close="true" :width="isMobile? '100%': '50%'">
    <notification-group-form
        v-model:formModel="formModel"
        @success="saveSuccess"
    ></notification-group-form>
  </base-dialog>
</template>
