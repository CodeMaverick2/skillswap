import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from './api'

type NotificationsModule = typeof import('expo-notifications')

let Notifications: NotificationsModule | null = null

async function loadNotifications() {
  if (Notifications) return Notifications
  try {
    Notifications = await import('expo-notifications')
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
    return Notifications
  } catch {
    return null
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Native-only — web has no push token path and can hang permission prompts
  if (Platform.OS === 'web') return null

  const mod = await loadNotifications()
  if (!mod) return null

  if (Platform.OS === 'android') {
    await mod.setNotificationChannelAsync('default', {
      name: 'default',
      importance: mod.AndroidImportance.DEFAULT,
    })
  }

  const { status: existing } = await mod.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await mod.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  const projectId =
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId

  const tokenRes = projectId
    ? await mod.getExpoPushTokenAsync({ projectId })
    : await mod.getExpoPushTokenAsync()

  const token = tokenRes.data
  if (token) {
    try {
      await api.put('/users/me/push-token', { token })
    } catch {
      // ignore
    }
  }
  return token
}

export function addNotificationResponseListener(
  handler: (data: Record<string, unknown>) => void
) {
  if (Platform.OS === 'web') return () => {}

  let sub: { remove: () => void } | null = null
  loadNotifications().then((mod) => {
    if (!mod) return
    sub = mod.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as Record<string, unknown>
      handler(data)
    })
  })
  return () => sub?.remove()
}
