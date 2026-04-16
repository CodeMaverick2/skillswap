import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/spacing'

export function NetworkBanner({ visible }: { visible: boolean }) {
  const { colors } = useTheme()
  if (!visible) return null

  return (
    <View
      style={{
        backgroundColor: `${colors.error}20`,
        borderBottomWidth: 1,
        borderBottomColor: `${colors.error}40`,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.xs + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.error} style={{ marginRight: spacing.xs }} />
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.error }}>
        You are offline. Some actions may fail until connection returns.
      </Text>
    </View>
  )
}
