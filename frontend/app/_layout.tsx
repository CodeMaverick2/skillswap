import { useEffect } from 'react'
import { View } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { ToastContainer } from '@/components/ui/ToastContainer'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
})

function AuthGate() {
  const { user, isLoading, setLoading } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const { isDark } = useTheme()

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true)
      try {
        await authService.restoreSession()
      } catch {
        // Session restore failed — user will be redirected to auth
      }
      setLoading(false)
    }
    restoreSession()
  }, [])

  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome')
      }
    } else {
      const inOnboarding = segments[0] === '(auth)' && segments[1] === 'onboarding'
      if (!user.onboardingCompleted) {
        if (!inOnboarding) {
          router.replace('/(auth)/onboarding/step1-profile')
        }
      } else if (inAuthGroup) {
        router.replace('/(tabs)/discover')
      }
    }
  }, [user, isLoading, segments])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
      <ToastContainer />
    </>
  )
}

function RootLayoutContent() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })
  const { colors } = useTheme()

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return <AuthGate />
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
