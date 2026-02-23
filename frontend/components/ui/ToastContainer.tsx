import React, { useEffect } from 'react'
import { View, Text, Platform } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useToastStore, Toast, ToastType } from '@/store/toast.store'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

function ToastItem({ toast }: { toast: Toast }) {
  const { colors } = useTheme()
  const translateY = useSharedValue(-80)
  const opacity = useSharedValue(0)
  const { hide } = useToastStore()

  const config: Record<ToastType, { bg: string; icon: string; iconColor: string; border: string }> = {
    success: {
      bg: colors.surface,
      icon: 'checkmark-circle',
      iconColor: colors.success,
      border: colors.success,
    },
    error: {
      bg: colors.surface,
      icon: 'alert-circle',
      iconColor: colors.error,
      border: colors.error,
    },
    warning: {
      bg: colors.surface,
      icon: 'warning',
      iconColor: colors.warning,
      border: colors.warning,
    },
    info: {
      bg: colors.surface,
      icon: 'information-circle',
      iconColor: colors.info,
      border: colors.info,
    },
  }

  const c = config[toast.type]

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 })
    opacity.value = withTiming(1, { duration: 200 })

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 })
      translateY.value = withTiming(-60, { duration: 200 }, () => {
        runOnJS(hide)(toast.id)
      })
    }, (toast.duration || 3000) - 400)

    return () => clearTimeout(timer)
  }, [])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          backgroundColor: c.bg,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: c.border + '40',
          borderLeftWidth: 3,
          borderLeftColor: c.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 8,
          maxWidth: 360,
        },
        animStyle,
      ]}
    >
      <Ionicons
        name={c.icon as any}
        size={20}
        color={c.iconColor}
        style={{ marginRight: spacing.sm }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: 'Inter_500Medium',
          fontSize: 14,
          color: colors.textPrimary,
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {toast.message}
      </Text>
    </Animated.View>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()
  const insets = useSafeAreaInsets()

  if (toasts.length === 0) return null

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + spacing.base,
        left: spacing.base,
        right: spacing.base,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  )
}
