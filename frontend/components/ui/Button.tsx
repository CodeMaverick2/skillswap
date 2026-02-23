import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  leftIcon?: React.ReactNode
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
}: ButtonProps) {
  const { colors } = useTheme()
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 })
  }
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 })
  }
  const handlePress = () => {
    if (disabled || loading) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  const getBackgroundColor = (): string => {
    if (disabled) return colors.border
    switch (variant) {
      case 'primary':
        return colors.primary
      case 'secondary':
        return colors.secondary
      case 'ghost':
        return 'transparent'
      case 'outline':
        return 'transparent'
      case 'danger':
        return colors.error
      default:
        return colors.primary
    }
  }

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted
    switch (variant) {
      case 'ghost':
        return colors.textSecondary
      case 'outline':
        return colors.primary
      default:
        return '#FFFFFF'
    }
  }

  const getBorderColor = (): string => {
    switch (variant) {
      case 'outline':
        return colors.primary
      case 'ghost':
        return 'transparent'
      default:
        return 'transparent'
    }
  }

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }
      case 'lg':
        return { paddingVertical: spacing.base + 2, paddingHorizontal: spacing.xl }
      default:
        return { paddingVertical: spacing.md + 1, paddingHorizontal: spacing.lg }
    }
  }

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 13
      case 'lg':
        return 16
      default:
        return 15
    }
  }

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[
        animatedStyle,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth:
            variant === 'outline' || variant === 'ghost' ? 1.5 : 0,
          borderColor: getBorderColor(),
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          ...getPadding(),
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            style={[
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                fontFamily: 'Inter_600SemiBold',
                marginLeft: leftIcon ? spacing.sm : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  )
}
