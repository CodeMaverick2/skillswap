import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import api, { BASE_URL } from './api'
import { useAuthStore, User } from '@/store/auth.store'

export interface RegisterData {
  email:           string
  username:        string
  password:        string
  confirmPassword: string
}

export interface LoginData {
  email:    string
  password: string
}

const REFRESH_TOKEN_KEY = 'refreshToken'

export const authService = {
  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data)
    const { user, accessToken, refreshToken } = response.data.data
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    useAuthStore.getState().setAuth(user as User, accessToken as string)
    return response.data
  },

  async login(data: LoginData) {
    const response = await api.post('/auth/login', data)
    const { user, accessToken, refreshToken } = response.data.data
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
    useAuthStore.getState().setAuth(user as User, accessToken as string)
    return response.data
  },

  async logout() {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken })
      }
    } catch {
      // Ignore — local state is cleared regardless
    } finally {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
      useAuthStore.getState().clearAuth()
    }
  },

  /** Revoke all sessions across all devices */
  async logoutAll() {
    try {
      await api.post('/auth/logout-all')
    } catch {
      // Ignore errors — clear local state regardless
    } finally {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
      useAuthStore.getState().clearAuth()
    }
  },

  /** Called on app start to restore session from a stored refresh token */
  async restoreSession(): Promise<boolean> {
    const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    if (!storedRefresh) return false

    try {
      // Use bare axios to skip our interceptor (no access token yet)
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: storedRefresh,
      })
      const { accessToken, refreshToken: newRefresh } = data.data

      useAuthStore.getState().setAccessToken(accessToken as string)
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh as string)

      // Now fetch the user profile with the fresh access token
      const profileRes = await api.get('/users/me')
      useAuthStore.getState().setUser(profileRes.data.data as User)
      return true
    } catch {
      // Refresh failed — clear stale token
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
      useAuthStore.getState().clearAuth()
      return false
    }
  },
}
