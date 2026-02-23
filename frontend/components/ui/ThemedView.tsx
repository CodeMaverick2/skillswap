import { View, ViewProps } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface ThemedViewProps extends ViewProps {
  variant?: 'bg' | 'surface' | 'surfaceAlt'
}

export function ThemedView({ variant = 'bg', style, ...props }: ThemedViewProps) {
  const { colors } = useTheme()
  const bg =
    variant === 'bg'
      ? colors.bg
      : variant === 'surface'
      ? colors.surface
      : colors.surfaceAlt
  return <View style={[{ backgroundColor: bg }, style]} {...props} />
}
