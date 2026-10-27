import { useUserStore } from '@/store/modules/user'

export function usePermission() {
  const userStore = useUserStore()

  const hasPermission = (required: string[] = []) => {
    if (!required.length) return true
    return required.some((p) => userStore.permissions.includes(p))
  }

  // Quyền theo hành động trên 1 feature (BE cũng chặn bằng [RequireFeaturePermission] nên đây chỉ để ẩn nút)
  const hasAction = (feature: string, action: string) => !!userStore.permissionActions?.[feature]?.includes(action)

  return {
    hasPermission,
    hasAction,
  }
}
