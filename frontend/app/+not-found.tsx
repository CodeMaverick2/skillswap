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
      <View style={{
        backgroundColor: colors.primary,
        borderRadius: 20,
        width: 84,
        height: 84,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: `${colors.primaryLight}88`,
      }}>
        <Text style={{ fontSize: 40 }}>🧭</Text>
      </View>
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 22,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        Screen not found
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
        This route does not exist in the current app flow.
      </Text>
      <Link href="/(auth)/welcome">
        <View
          style={{
            backgroundColor: colors.secondary,
            borderRadius: 14,
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
            Go to Welcome
          </Text>
        </View>
      </Link>
    </SafeAreaView>
  )
}
