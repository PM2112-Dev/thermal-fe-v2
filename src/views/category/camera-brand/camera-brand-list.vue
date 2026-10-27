<script setup lang="tsx">
import { usePermission } from '@/hooks/web/usePermission'
import { computed, onMounted, ref } from 'vue'
import { ElTag, ElTooltip } from 'element-plus'
import { useLang } from '@/hooks/web/useI18n'
import ListTemplate from '@/components/PageTemplate/List/ListTemplate.vue'
import DrawerForm from '@/components/Form/DrawerForm.vue'
import SearchButton from '@/components/Button/SearchButton.vue'
import EditCircleButton from '@/components/Button/EditCircleButton.vue'
import DeleteCircleButton from '@/components/Button/DeleteCircleButton.vue'
import { TableColumn } from '@/components/Table'
import { STATUS_ACTIVE } from '@/constants'
import { enumLabel } from '@/utils/enumLabel'
import { localPagedFetch } from '@/utils/localPaging'
import { deleteCameraBrandApi, getCameraBrandsApi, getCameraPluginsApi } from '@/api/camera-brand'
import CameraBrandForm from '@/views/category/camera-brand/components/CameraBrandForm.vue'
import { useAppStore } from '@/store/modules/app'

const { t } = useLang()
const { hasAction } = usePermission()
const appStore = useAppStore()
const isMobile = computed(() => appStore.isMobile)

const elTableRef = ref<InstanceType<typeof ListTemplate>>()
const dialogVisible = ref(false)
const formModel = ref<Record<string, any>>({})

// Trạng thái plugin toàn hệ thống (hiển thị ở dải thông tin phía trên bảng)
const pluginStatus = ref<{ hostContractVersion?: string; plugins: any[]; loadErrors: string[] }>({
  plugins: [],
  loadErrors: [],
})
const loadPluginStatus = async () => {
  try {
    const res = await getCameraPluginsApi()
    pluginStatus.value = res.data ?? pluginStatus.value
  } catch {
    // không có quyền / plugin tắt: bỏ qua dải thông tin
  }
}
onMounted(loadPluginStatus)

const pluginState = (row: any) => {
  if (!row.plugin) return { type: 'info', text: t('cameraBrand.pluginNone') }
  return row.plugin.active
    ? { type: 'success', text: t('cameraBrand.pluginActive') }
    : { type: 'warning', text: t('cameraBrand.pluginDisabled') }
}

const columns = computed<TableColumn[]>(() => [
  {
    prop: 'code',
    label: t('cameraBrand.code'),
    width: 230,
    slots: {
      default: ({ row }) => (
        <span class="brand-code">
          {row.code}
          {row.builtIn && <span class="brand-chip">{t('cameraBrand.builtIn')}</span>}
        </span>
      ),
    },
  },
  { prop: 'name', label: t('cameraBrand.name'), minWidth: 160 },
  {
    prop: 'plugin',
    label: t('cameraBrand.plugin'),
    minWidth: 220,
    slots: {
      default: ({ row }) => {
        const state = pluginState(row)
        return (
          <div class="plugin-cell">
            <ElTag size="small" type={state.type as any} effect="light" round>
              {state.text}
            </ElTag>
            {row.plugin && (
              <span class="plugin-version">
                v{row.plugin.pluginVersion} · contract {row.plugin.contractVersion}
              </span>
            )}
          </div>
        )
      },
    },
  },
  {
    prop: 'capabilities',
    label: t('cameraBrand.capabilities'),
    minWidth: 260,
    slots: {
      default: ({ row }) => (
        <div class="cap-list">
          {(row.plugin?.capabilities ?? []).map((c: string) => (
            <span class="cap-tag" key={c}>
              {c.replace(/^ICamera/, '')}
            </span>
          ))}
        </div>
      ),
    },
  },
  { prop: 'cameraCount', label: t('cameraBrand.cameraCount'), width: 110, align: 'center' },
  {
    prop: 'displayStatus',
    width: 130,
    label: t('fields.status'),
    slots: {
      default: ({ row }) => (
        <span style={{ color: row.status === 'Active' ? 'var(--success)' : 'var(--danger)' }}>
          {enumLabel('commonStatusList', row.status, row.displayStatus)}
        </span>
      ),
    },
  },
  {
    label: t('fields.action'),
    width: '140px',
    slots: {
      default: (scope: any) => (
        <div>
          {hasAction('camera-brand-list', 'update') && <EditCircleButton onClick={() => openDialogEdit(scope)} />}
          {scope.row.builtIn || scope.row.cameraCount > 0 ? (
            <ElTooltip content={t('cameraBrand.builtInHint')} disabled={!scope.row.builtIn}>
              <span />
            </ElTooltip>
          ) : (
            hasAction('camera-brand-list', 'delete') && <DeleteCircleButton onClick={() => openDelete(scope)} />
          )}
        </div>
      ),
    },
  },
])

const openDialogAdd = () => {
  formModel.value = { status: STATUS_ACTIVE }
  dialogVisible.value = true
}
const openDialogEdit = (scope: any) => {
  formModel.value = JSON.parse(JSON.stringify(scope.row))
  dialogVisible.value = true
}
const openDelete = (scope: any) => {
  elTableRef.value?.deleteRow(deleteCameraBrandApi, scope.row.id)
}
const saveSuccess = () => {
  dialogVisible.value = false
  elTableRef.value?.refresh()
  loadPluginStatus()
}
</script>

<template>
  <list-template
    :show-btn-add="hasAction('camera-brand-list', 'create')"
    ref="elTableRef"
    key-list="camera-brand-list"
    :title="t('cameraBrand.listTitle')"
    :columns="columns"
    :use-table-config="{ fetchDataApi: localPagedFetch(getCameraBrandsApi) }"
    :search-props="{ className: '' }"
    @addHandler="openDialogAdd"
    @edit="openDialogEdit"
    @delete="openDelete"
  >
    <template slot="search" v-slot="{ searchParams, tableMethods }">
      <div class="filter-row">
        <div class="filter-item">
          <div class="filter-label">{{ t('fields.name') }}</div>
          <el-input v-model="searchParams.keyword" class="filter-input" clearable
                    :placeholder="t('cameraBrand.searchPlaceholder')" @keyup.enter="tableMethods.getList"/>
        </div>
        <search-button @click="tableMethods.getList"></search-button>
        <div class="plugin-summary" v-if="pluginStatus.hostContractVersion">
          <span>{{ t('cameraBrand.hostContract') }}: <b>{{ pluginStatus.hostContractVersion }}</b></span>
          <span>{{ t('cameraBrand.loadedPlugins') }}: <b>{{ pluginStatus.plugins.length }}</b></span>
        </div>
      </div>
      <el-alert
        v-if="pluginStatus.loadErrors.length"
        class="mt-3"
        type="error"
        show-icon
        :closable="false"
        :title="t('cameraBrand.loadErrors')"
      >
        <div v-for="err in pluginStatus.loadErrors" :key="err" class="text-xs">{{ err }}</div>
      </el-alert>
    </template>
  </list-template>
  <drawer-form v-model="dialogVisible" :size="isMobile ? '100%' : '480px'" :show-close="true">
    <camera-brand-form :formModel="formModel" @success="saveSuccess"/>
  </drawer-form>
</template>

<style>
.brand-code {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.brand-chip {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.plugin-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.plugin-version {
  font-size: 12px;
  color: var(--text-sub);
}
.cap-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cap-tag {
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-sub);
  background: var(--bg-body);
}
.plugin-summary {
  display: flex;
  gap: 18px;
  margin-left: auto;
  align-self: center;
  font-size: 12px;
  color: var(--text-sub);
}
.plugin-summary b {
  color: var(--primary);
}
</style>
