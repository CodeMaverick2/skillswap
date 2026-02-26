import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/auth.store'

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ───────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: silent token refresh on 401 ─────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else if (token) resolve(token)
  })
  failedQueue = []
}

const clearSession = async () => {
  useAuthStore.getState().clearAuth()
  await SecureStore.deleteItemAsync('refreshToken').catch(() => {})
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only intercept 401s on non-retry requests that have a config (not network errors)
    if (error.response?.status !== 401 || original._retry || !original) {
      return Promise.reject(error)
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (original.headers) original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }).catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true

    try {
      const storedRefreshToken = await SecureStore.getItemAsync('refreshToken')
      if (!storedRefreshToken) throw new Error('No refresh token stored')

      // Use a bare axios call to avoid recursive interceptor loop
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: storedRefreshToken })
      const newAccessToken: string  = data.data.accessToken
      const newRefreshToken: string = data.data.refreshToken

      useAuthStore.getState().setAccessToken(newAccessToken)
      await SecureStore.setItemAsync('refreshToken', newRefreshToken)

      processQueue(null, newAccessToken)
      if (original.headers) original.headers.Authorization = `Bearer ${newAccessToken}`
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      await clearSession()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
