import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const { user, accessToken, isLoading } = useAuthStore()

  const logout = async () => {
    await authService.logout()
  }

  const logoutAll = async () => {
    await authService.logoutAll()
  }

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    logout,
    logoutAll,
  }
}
