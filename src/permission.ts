import router from './router'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { NO_REDIRECT_WHITE_LIST } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermission } from '@/hooks/web/usePermission'

const { start, done } = useNProgress()

const { loadStart, loadDone } = usePageLoading()

router.beforeEach(async (to, from, next) => {
  start()
  loadStart()
  const userStore = useUserStoreWithOut()
  if (userStore.isAuthenticated) {
    if (to.path === '/login') {
      next({ path: '/' })
    } else {
      // State cũ (đã lưu từ trước) có thể thiếu quyền -> nạp lại từ myProfile thay vì kẹt ở 403/404
      if (!userStore.permissions.length) {
        try {
          await userStore.loadCurrentUser()
        } catch {
          // 401 sẽ do interceptor đưa về trang đăng nhập
        }
      }
      const { hasPermission } = usePermission()
      const requiredPermissions = (to.meta.permission as string[]) || []

      if (hasPermission(requiredPermissions)) {
        const redirectPath = from.query.redirect ?? to.path
        const redirect = decodeURIComponent(redirectPath as string)
        if (to.path === redirect) {
          next()
          return
        }
        next({ path: redirect })
      } else {
        next({ name: '403' })
      }
    }
  } else if (NO_REDIRECT_WHITE_LIST.indexOf(to.path) !== -1) {
    next()
  } else {
    next(`/login?redirect=${to.path}`)
  }
})

router.afterEach((to) => {
  useTitle(to)
  done()
  loadDone()
})
