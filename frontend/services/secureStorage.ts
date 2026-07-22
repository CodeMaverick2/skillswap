import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * SecureStore is native-only. On web (Playwright / Expo web), fall back to localStorage.
 */
const isWeb = Platform.OS === 'web'

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null
    } catch {
      return null
    }
  }
  return SecureStore.getItemAsync(key)
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(key, value)
    } catch {
      // ignore quota / private mode
    }
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      // ignore
    }
    return
  }
  await SecureStore.deleteItemAsync(key)
}
