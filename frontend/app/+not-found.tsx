import { View, Text } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/spacing'

export default function NotFoundScreen() {
  const { colors } = useTheme()
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
    >
      <Text style={{ fontSize: 52, marginBottom: spacing.lg }}>🔍</Text>
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 22,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        Page not found
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing['2xl'],
          lineHeight: 22,
        }}
      >
        The screen you're looking for doesn't exist.
      </Text>
      <Link href="/(auth)/welcome">
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: spacing.md + 2,
            paddingHorizontal: spacing.xl,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}
          >
            Go to Home
          </Text>
        </View>
      </Link>
    </SafeAreaView>
  )
}
