import { defineStore } from 'pinia'
import { store } from '@/store'
import { UserType } from '@/api/login/types'
import { ElMessageBox } from 'element-plus'
import router from '@/router'
import { logoutApi, myProfileApi, refreshTokenApi } from '@/api/login'
import { getFirebaseToken } from '@/plugins/firebase/firebase'
import { useLang } from '@/hooks/web/useI18n'

let refreshTimer: number | null = null

interface UserState {
  userInfo?: UserType
  accessToken: string
  refreshToken: string
  expiresAt: number
  roleRouters?: string[] | AppCustomRouteRecordRaw[]
  rememberMe: boolean
  permissions: string[]
  // featureCode -> các action (read/create/update/delete/import/export) được cấp
  permissionActions: Record<string, string[]>
}

export const useUserStore = defineStore('user', {
  state: (): UserState => {
    return {
      userInfo: undefined,
      accessToken: '',
      refreshToken: '',
      expiresAt: 0 as number, // timestamp (milliseconds)
      rememberMe: true,
      permissions: [] as string[],
      permissionActions: {} as Record<string, string[]>,
    }
  },
  getters: {
    isAdmin(): boolean {
      return this?.userInfo?.roleNames === 'Admin';
    },
    getAccessToken(): string {
      return this.accessToken
    },
    isAuthenticated(): boolean {
      return !!this.getAccessToken
    },
    getUserInfo(): UserType | undefined {
      return this.userInfo
    },
    getRoleRouters(): string[] | AppCustomRouteRecordRaw[] | undefined {
      return this.roleRouters
    },
    getRememberMe(): boolean {
      return this.rememberMe
    },
    getUserName(): string | undefined {
      return this.userInfo?.username
    },
  },
  actions: {
    updateStates(state: Partial<UserState>) {
      this.$state = { ...this.$state, ...state }
    },
    // Quyền do BE trả dạng [{ featureCode, actions[] }] (hoặc danh sách mã cũ). Trả null khi response không có
    // trường quyền (vd. API không kèm quyền) để KHÔNG ghi đè quyền đang có bằng danh sách rỗng.
    extractPermissions(user: any): { codes: string[]; actions: Record<string, string[]> } | null {
      const raw = user?.permissions ?? user?.features
      if (!Array.isArray(raw)) return null
      const actions: Record<string, string[]> = {}
      for (const item of raw) {
        const code = typeof item === 'string' ? item : (item?.featureCode ?? item?.code)
        if (typeof code !== 'string' || !code) continue
        actions[code] = Array.isArray(item?.actions) ? item.actions : (actions[code] ?? ['read'])
      }
      return { codes: Object.keys(actions), actions }
    },
    updateStatesFromResponse(res: any) {
      const expireAt = new Date(res.data.refreshTokenExpiryTime).getTime()
      const user = expireAt ? res.data.user : res.data
      const perm = this.extractPermissions(user)
      const permStates = perm ? { permissions: perm.codes, permissionActions: perm.actions } : {}
      let states = {
        userInfo: res.data,
        ...permStates,
      } as object
      if (expireAt) {
        states = {
          userInfo: res.data.user,
          accessToken: res.data.token,
          refreshToken: res.data.refreshToken,
          ...permStates,
          expiresAt: expireAt,
        }
      }
      this.updateStates(states)
      this.loadScheduleRefresh()
    },
    logoutConfirm() {
      const { t } = useLang()
      ElMessageBox.confirm(t('common.logoutConfirm'), '', {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      }).then(async () => {
        const token = await getFirebaseToken();
        try {
          await logoutApi({
            firebaseToken: token,
            deviceType: 'web'
          })
        }finally {
          this.resetAndRedirectToLogin()
        }
      })
    },
    reset() {
      this.updateStates({ userInfo: undefined, accessToken: '', refreshToken: '', expiresAt: 0, permissions: [], permissionActions: {} })
    },
    resetAndRedirectToLogin() {
      this.reset()
      void router.replace('/login')
    },
    async loadCurrentUser() {
      await myProfileApi().then((res) => {
        this.updateStatesFromResponse(res)
      })
    },
    loadScheduleRefresh() {
      if (this.accessToken && this.refreshToken && this.expiresAt) {
        this.scheduleRefresh()
      }
    },
    scheduleRefresh() {
      if (refreshTimer) clearInterval(refreshTimer)
      const refreshBeforeMs = 30 * 1000 // refresh trước khi hết hạn 30s
      const timeLeft = this.expiresAt - Date.now() - refreshBeforeMs
      if (timeLeft <= 0) {
        void this.refreshTokenAction()
        return
      }
      refreshTimer = setTimeout(() => {
        void this.refreshTokenAction()
      }, timeLeft)
    },

    async refreshTokenAction() {
      try {
        const res = await refreshTokenApi({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
        })
        this.updateStatesFromResponse(res)
        console.log('[Auth] Token refreshed successfully')
      } catch (err) {
        console.error('[Auth] Refresh token failed', err)
        this.resetAndRedirectToLogin()
      }
    },
  },
  persist: true,
})

export const useUserStoreWithOut = () => {
  return useUserStore(store)
}
