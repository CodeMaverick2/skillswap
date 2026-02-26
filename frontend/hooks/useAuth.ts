import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const { user, accessToken, isLoading, setLoading } = useAuthStore()

  const logout = async () => {
    setLoading(true)
    await authService.logout()
    setLoading(false)
  }

  const logoutAll = async () => {
    setLoading(true)
    await authService.logoutAll()
    setLoading(false)
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
