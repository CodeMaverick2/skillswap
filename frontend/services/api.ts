import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { useAuthStore } from '@/store/auth.store'

const getDevHostFromExpo = () => {
  const hostUri = Constants.expoConfig?.hostUri
  if (!hostUri) return null
  const host = hostUri.split(':')[0]
  return host || null
}

const FALLBACK_HOST = getDevHostFromExpo() || 'localhost'
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || `http://${FALLBACK_HOST}:5000`
export const BASE_URL = `${API_ORIGIN}/api`
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || API_ORIGIN

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const shouldRetry = (error: AxiosError) => {
  const method = error.config?.method?.toUpperCase()
  if (!method || method !== 'GET') return false
  if (error.response) return error.response.status >= 500
  return error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || error.message === 'Network Error'
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── Request interceptor: attach access token ───────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    ;(config as InternalAxiosRequestConfig & { metadata?: { start: number } }).metadata = { start: Date.now() }
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
  async (response) => {
    const started = (response.config as InternalAxiosRequestConfig & { metadata?: { start: number } }).metadata?.start
    if (__DEV__ && started) {
      const elapsed = Date.now() - started
      if (elapsed > 800) {
        const method = response.config.method?.toUpperCase() || 'GET'
        console.log(`[api:slow] ${method} ${response.config.url} took ${elapsed}ms`)
      }
    }
    return response
  },
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined
    if (cfg && shouldRetry(error)) {
      cfg._retryCount = cfg._retryCount || 0
      if (cfg._retryCount < 2) {
        cfg._retryCount += 1
        const waitMs = cfg._retryCount === 1 ? 250 : 600
        await sleep(waitMs)
        return api(cfg)
      }
    }

    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const url = original?.url || ''
    const isAuthRoute = ['/auth/login', '/auth/register', '/auth/refresh'].some((p) => url.includes(p))

    // Only intercept 401s on non-retry requests with config, excluding auth endpoints.
    if (error.response?.status !== 401 || original._retry || !original || isAuthRoute) {
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
      if (!storedRefreshToken) {
        // No refresh token yet (or already cleared); bubble original 401 cleanly.
        return Promise.reject(error)
      }

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
