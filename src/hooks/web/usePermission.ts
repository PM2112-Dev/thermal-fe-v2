import { useUserStore } from '@/store/modules/user'

export function usePermission() {
  const userStore = useUserStore()

  const hasPermission = (required: string[] = []) => {
    if (!required.length) return true
    return required.some((p) => userStore.permissions.includes(p))
  }

  // Quyền theo hành động trên 1 feature (BE cũng chặn bằng [RequireFeaturePermission] nên đây chỉ để ẩn nút)
  const hasAction = (feature: string, action: string) => !!userStore.permissionActions?.[feature]?.includes(action)

  // Nhóm "Quản lý AI" có thể bị tắt ở appsettings backend (AiManagement:Enabled=false) — khi đó backend bỏ các quyền ai*
  // khỏi quyền của user, nên chỉ cần kiểm tra quyền là ẩn được mọi chỗ liên quan.
  const hasAiManagement = () => hasPermission(['ai', 'ai-feature-list', 'ai-model-list'])

  return {
    hasPermission,
    hasAction,
    hasAiManagement,
  }
}
