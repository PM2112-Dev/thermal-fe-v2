<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { enumLabel } from '@/utils/enumLabel'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import {TableColumn} from '@/components/Table'
import {useLang} from '@/hooks/web/useI18n'
import {deleteUserApi, getUserListApi, syncTelegramChatIdApi} from '@/api/user'
import {computed, ref} from 'vue'
import UserForm from '@/views/category/user/components/UserForm.vue'
import SelectFromConfig from '@/components/Selection/SelectFromConfig.vue'
import {STATUS_ACTIVE} from '@/constants'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import {joinFieldValues} from "@/utils/stringUtils";
import ApiButton from '@/components/Button/ApiButton.vue'
import SearchButton from '@/components/Button/SearchButton.vue'
import ActionForm from '@/components/Form/ActionForm.vue'
import UserCard from "@/views/category/user/components/UserCard.vue";
import { useAppStore } from '@/store/modules/app'

const {t} = useLang()
const { hasAction } = usePermission()
const renderActionColumn = (scope: any) => {
  return (
      <div>
        <EditCircleButton onClick={() => openDialogEdit(scope)}/>
        <DeleteCircleButton onClick={() => openDelete(scope)}/>
      </div>
  )
}
const columns = computed<TableColumn[]>(() => [
  {prop: 'fullName', label: t('user.fullName')},
  {prop: 'email', label: t('fields.email')},
  {prop: 'phone', label: t('fields.phone')},
  {
    label: t('fields.area'),
    slots: {
      default: (scope: any) => (
          <span>{joinFieldValues(scope.row.areas, 'name')}</span>
      ),
    },
  },
  {
    prop: 'displayStatus',
    width: 140,
    label: t('fields.status'),
    slots: {
      default: ({row}) => (<span   style={{
        color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)'
      }}>{enumLabel('userStatusList', row.status, row.displayStatus)}</span>)
    },
  },
  {prop: 'createdAt', width: 260, label: t('fields.created_at')},
  {
    label: t('fields.action'),
    width: '110px',
    slots: {
      default: renderActionColumn,
    },
  },
])
const dialogVisible = ref(false)
const elTableRef = ref<InstanceType<typeof ListTemplate>>()

const formModel = ref({
  id: null,
  username: '',
  firstName: '',
  lastMiddleName: '',
  email: '',
  phone: '',
  password: '',
  status: STATUS_ACTIVE,
})

const openDialogAdd = () => {
  formModel.value = {
    id: null,
    username: '',
    firstName: '',
    lastMiddleName: '',
    email: '',
    phone: '',
    password: '',
    status: STATUS_ACTIVE,
  }
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}

const openDelete = (scope: any) => {
  elTableRef?.value?.deleteRow(deleteUserApi, scope.row.id)
}

const saveSuccess = () => {
  elTableRef?.value?.refresh()
  dialogVisible.value = false
}
const appStore = useAppStore();
const isMobile = computed(() => appStore.isMobile)
</script>

<template>
  <list-template
      :show-btn-add="hasAction('user', 'create')"
      :title="t('user.title')"
      ref="elTableRef"
      key-list="user-list"
      :columns="columns"
      :use-table-config="{
        fetchDataApi: getUserListApi,
      }"
      @addHandler="openDialogAdd"
      :search-props="{ visibleSearchButton: false, className: '' }"
      :cardComponent="UserCard"
      @edit="openDialogEdit"
      @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams }">
      <div class="filter-row">
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.status') }}</div>
          <select-from-config
              class="filter-input"
              key-config="userStatusList"
              v-model="searchParams.userStatus"
              clearable
          ></select-from-config>
        </div>
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.name') }}</div>
          <el-input v-model="searchParams.name" clearable :placeholder="t('user.namePlaceholder')"/>
        </div>
        <div class="filter-item">
          <div class="filter-label">Email</div>
          <el-input v-model="searchParams.email" clearable :placeholder="t('user.emailPlaceholder')"/>
        </div>
        <div class="filter-item">
          <div class="filter-label">Telegram</div>
          <el-input v-model="searchParams.telegramUsername" clearable :placeholder="t('user.telegramPlaceholder')"/>
        </div>
        <search-button @click="elTableRef?.refresh()"/>
        <api-button
            :api="syncTelegramChatIdApi"
            class="btn-search" style="background: transparent; border: 1px solid var(--border); color: var(--text-main)"
        >
          ⟳ {{ t('user.syncTelegram') }}
        </api-button>
      </div>
    </template>

  </list-template>
  <ActionForm v-model="dialogVisible" :size="isMobile? '100%': '50%'">
    <user-form
        v-model:formModel="formModel"
        :title="formModel.id ? t('user.edit') : t('user.add')"
        @success="saveSuccess"
    ></user-form>
  </ActionForm>
</template>

<style lang="scss" scoped></style>
