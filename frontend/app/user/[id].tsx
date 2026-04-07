import { View, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing } from '@/theme/spacing'

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const router = useRouter()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textPrimary }}>User Profile</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.base }}>
        <Text style={{ fontSize: 44, marginBottom: spacing.md }}>👤</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.textPrimary, marginBottom: spacing.xs }}>Coming Soon</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
          Public user profiles will be available in the next update.
        </Text>
      </View>
    </SafeAreaView>
  )
}
