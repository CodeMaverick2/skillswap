import React, { useState, forwardRef, useCallback } from 'react'
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

export interface InputProps extends TextInputProps {
  label?:           string
  error?:           string
  hint?:            string
  leftIcon?:        keyof typeof Ionicons.glyphMap
  rightIcon?:       keyof typeof Ionicons.glyphMap
  onRightIconPress?: () => void
  isPassword?:      boolean
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    isPassword = false,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref
) {
  const { colors } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused,    setIsFocused]    = useState(false)

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border

  return (
    <View style={{ marginBottom: spacing.base }}>
      {label && (
        <Text style={{
          fontFamily: 'Inter_500Medium',
          fontSize: 13,
          color: isFocused ? colors.primary : colors.textSecondary,
          marginBottom: spacing.xs,
        }}>
          {label}
        </Text>
      )}

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor,
        paddingHorizontal: spacing.md,
        minHeight: 52,
      }}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={error ? colors.error : isFocused ? colors.primary : colors.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        )}

        <TextInput
          ref={ref}
          {...props}
          style={[{
            flex: 1,
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: 'transparent',
            paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
          }, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          selectionColor={colors.primary}
          textContentType={isPassword ? 'oneTimeCode' : props.textContentType}
          autoComplete={isPassword ? 'off' : props.autoComplete}
          onFocus={(e) => { setIsFocused(true);  onFocus?.(e)  }}
          onBlur={(e)  => { setIsFocused(false); onBlur?.(e)   }}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.error} style={{ marginRight: 4 }} />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.error, flex: 1 }}>
            {error}
          </Text>
        </View>
      )}

      {hint && !error && (
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: spacing.xs }}>
          {hint}
        </Text>
      )}
    </View>
  )
})
