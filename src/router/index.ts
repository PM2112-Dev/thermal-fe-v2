import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { App } from 'vue'
import Layout from '@/layout/index.vue'
// import { downloadFileFromUrl } from '@/utils/fileUtil'

const constantRoutes: AppRouteRecordRaw[] = [
  {
    path: '',
    component: Layout,
    redirect: 'dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { icon: 'dashboard', permission: ['home'] },
      },
    ],
  },
  {
    path: '/live',
    component: Layout,
    meta: { icon: 'table', permission: ['live'] },
    children: [
      {
        path: '',
        name: 'live',
        component: () => import('@/views/live/StreamPage.vue'),
        meta: { icon: 'camera', permission: ['live'] },
      },
      {
        path: 'detail/:id',
        name: 'live_detail',
        component: () => import('@/views/live/StreamDetail.vue'),
        meta: { icon: 'camera', permission: ['live'] },
      },
    ],
  },
  {
    path: '/stream',
    component: Layout,
    meta: { icon: 'table', permission: ['live'] },
    children: [
      {
        path: 'detail/:id',
        name: 'live_detail',
        component: () => import('@/views/live/StreamDetail.vue'),
        meta: { icon: 'camera', permission: ['live'] },
      },
    ],
  },
  {
    path: '/event',
    component: Layout,
    redirect: '/event/ai-notification',
    name: 'event',
    meta: { icon: 'map_pointer', permission: ['notification-system', 'event-history', 'pd-notification-system', 'pd-history', 'pd-summary', 'event-home', 'ai-monitoring'] },
    children: [
      {
        path: 'ai-notification',
        name: 'ai_system',
        component: () => import('@/views/event/ai-notification.vue'),
        meta: { icon: 'setting-bell', permission: ['ai-monitoring'] },
      },
      {
        path: 'vision-event-history/detail',
        name: 'vision_event_history_detail',
        component: () => import('@/views/event/vision-event-history/detail.vue'),
        hidden:true,
        meta: { icon: 'history', permission: ['ai-monitoring'], hidden: true },
      },
      {
        path: 'notification-system',
        name: 'notification_system',
        component: () => import('@/views/event/notification-system.vue'),
        meta: { icon: 'bell', permission: ['notification-system'] },
      },
      {
        path: 'event-history',
        name: 'event_history',
        component: () => import('@/views/event/event-history.vue'),
        meta: { icon: 'history', permission: ['event-history'] },
      },
      {
        path: 'pd-notification-system',
        name: 'pd_notification_system',
        component: () => import('@/views/event/pd-notification-system.vue'),
        meta: { icon: 'bolt', permission: ['pd-notification-system'] },
      },
      {
        path: 'pd-history',
        name: 'pd_history',
        component: () => import('@/views/event/pd-history.vue'),
        meta: { icon: 'history-bolt', permission: ['pd-history'] },
      },
      {
        path: 'pd-summary',
        name: 'pd_summary',
        component: () => import('@/views/event/pd-summary.vue'),
        meta: { icon: 'chart-bolt', permission: ['pd-summary'] },
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/event/home.vue'),
        meta: { icon: 'chart', permission: ['event-home'] },
      },
      {
        path: 'event-history/detail',
        name: 'event_history_detail',
        component: () => import('@/views/event/notification-system-detail.vue'),
        hidden:true,
        meta: { icon: 'history', permission: ['event-history'], hidden: true },
      },
      {
        // Cùng component với event_history_detail (dùng chung cho nhiệt độ + PD), tách route để
        // breadcrumb có title tĩnh ngay từ đầu, không đợi API trả dữ liệu.
        path: 'pd-notification-system/detail',
        name: 'pd_notification_detail',
        component: () => import('@/views/event/notification-system-detail.vue'),
        hidden: true,
        meta: { icon: 'history', permission: ['pd-notification-system'], hidden: true },
      },
    ],
  },
  {
    path: '/setting',
    component: Layout,
    redirect: '/setting/notification-group',
    name: 'notification_setting',
    meta: { icon: 'bell', permission: ['notification-channel', 'notification-group'] },
    children: [
      {
        path: 'notification-channel',
        name: 'notification_channel',
        component: () => import('@/views/notification/channel-list.vue'),
        meta: { icon: 'bell', permission: ['notification-channel'] },
      },
      {
        path: 'notification-group',
        name: 'notification_group',
        component: () => import('@/views/notification/group-list.vue'),
        meta: { icon: 'menu', permission: ['notification-group'] },
      },
    ],
  },
  {
    path: '/category',
    component: Layout,
    redirect: '/category/area',
    name: 'category',
    meta: { icon: 'menu', permission: ['area', 'user', 'camera-list', 'camera-sensor', 'machine-type', 'machine-list', 'camera-brand-list', 'settings', 'perm-mgmt'] },
    children: [
      {
        path: 'area',
        name: 'area',
        component: () => import('@/views/category/area/area-list.vue'),
        meta: { icon: 'map', permission: ['area'] },
      },
      {
        path: 'user',
        name: 'user',
        component: () => import('@/views/category/user/user-list.vue'),
        meta: { icon: 'user', permission: ['user'] },
      },
      {
        path: 'camera-list',
        name: 'camera_list',
        component: () => import('@/views/category/camera/camera-list.vue'),
        meta: { icon: 'menu-camera', permission: ['camera-list'] },
      },
      {
        path: 'camera-setting/:id',
        name: 'camera_setting',
        component: () => import('@/views/category/camera/camera-setting.vue'),
        meta: { icon: 'setting', permission: ['camera-list'] },
      },
      {
        path: 'camera-brand',
        name: 'camera_brand_list',
        component: () => import('@/views/category/camera-brand/camera-brand-list.vue'),
        meta: { icon: 'menu-camera', permission: ['camera-brand-list'] },
      },
      {
        path: 'camera-sensor',
        name: 'device_sensor',
        component: () => import('@/views/category/sensor/sensor-list.vue'),
        meta: { icon: 'sensor', permission: ['camera-sensor'] },
      },

      {
        path: 'machine-type',
        name: 'machine_type_list',
        component: () => import('@/views/category/machine-type/machine-type-list.vue'),
        meta: { icon: 'transformer', permission: ['machine-type'] },
      },
      {
        path: 'machine-list',
        name: 'machine_station',
        component: () => import('@/views/category/machine/machine-list.vue'),
        meta: { icon: 'factory', permission: ['machine-list'] },
      },
      {
        path: 'machine-part/:machineTypeId',
        name: 'machine_part',
        component: () => import('@/views/category/machine-part/machine-part-list.vue'),
        hidden: true,
      },
      {
        // Feature code 'settings' đã có sẵn ở BE (add_settings_feature.sql, dùng chung với forest-fe) -
        // chỉ quản lý công thức/biến số ΔPD% (gán công thức cho bộ phận vẫn ở Nhóm E - MachinePointDialog.vue).
        path: 'settings',
        name: 'formula_settings',
        component: () => import('@/views/category/settings/formula-settings.vue'),
        meta: { icon: 'setting', permission: ['settings'] },
      },
    ],
  },
  {
    path: '/ai',
    component: Layout,
    redirect: '/ai/feature-list',
    name: 'ai',
    meta: { icon: 'eye', permission: ['ai-feature-list', 'ai-model-list'] },
    children: [
      {
        path: 'feature-list',
        name: 'ai_feature_list',
        component: () => import('@/views/ai/ai-feature-list.vue'),
        meta: { icon: 'setting', permission: ['ai-feature-list'] },
      },
      {
        path: 'model-list',
        name: 'ai_model_list',
        component: () => import('@/views/ai/ai-model-list.vue'),
        meta: { icon: 'form', permission: ['ai-model-list'] },
      },
    ],
  },
  {
    path: '/report',
    component: Layout,
    name: 'report',
    meta: { icon: 'chart', permission: ['manual'] },
    children: [
      {
        path: 'manual',
        name: 'user_manual',
        meta: { icon: 'chart', permission: ['manual'] },
        // beforeEnter: (_to, _from, next) => {
        //   const fileUrl = '/report/CGI%20Manual.pdf'
        //   downloadFileFromUrl(fileUrl, 'Hướng dẫn sử dụng.pdf')
        //   window.close()
        //   next(false)
        // }
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/auth/login.vue'),
    hidden: true,
  },
  {
    path: '/change-password',
    component: () => import('@/views/auth/change-password.vue'),
    hidden: true,
  },
  {
    path: '/404',
    component: () => import('@/views/error/404.vue'),
    hidden: true,
  },
  {
    path: '/403',
    component: () => import('@/views/error/403.vue'),
    name: "403",
    hidden: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/404', hidden: true },
]

const history = createWebHistory()

const router = createRouter({
  history: history,
  strict: true,
  routes: constantRoutes as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 }),
})
export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
