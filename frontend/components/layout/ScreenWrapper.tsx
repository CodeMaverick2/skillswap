import { ScrollView, View, KeyboardAvoidingView, Platform, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/spacing'

interface ScreenWrapperProps {
  children: React.ReactNode
  scrollable?: boolean
  padded?: boolean
  keyboardAvoiding?: boolean
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
}

export function ScreenWrapper({
  children,
  scrollable = false,
  padded = true,
  keyboardAvoiding = false,
  style,
  contentContainerStyle,
}: ScreenWrapperProps) {
  const { colors } = useTheme()

  const inner = scrollable ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        padded ? { paddingHorizontal: spacing.base } : undefined,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        { flex: 1, backgroundColor: colors.bg },
        padded ? { paddingHorizontal: spacing.base } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  )

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
      </KeyboardAvoidingView>
    )
  }

  return inner
}
