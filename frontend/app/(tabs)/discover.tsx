import { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { useAuth } from '@/hooks/useAuth'

function ShimmerCard({ delay = 0 }: { delay?: number }) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    )
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.base,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }, style]}
    >
      {/* Avatar + name row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, marginRight: spacing.md }} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 14, width: '55%', backgroundColor: colors.surfaceAlt, borderRadius: 4, marginBottom: 6 }} />
          <View style={{ height: 11, width: '35%', backgroundColor: colors.surfaceAlt, borderRadius: 4 }} />
        </View>
        <View style={{ height: 28, width: 72, backgroundColor: colors.surfaceAlt, borderRadius: radius.full }} />
      </View>
      {/* Skill chips */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[60, 80, 52].map((w, i) => (
          <View key={i} style={{ height: 24, width: w, backgroundColor: colors.surfaceAlt, borderRadius: radius.full }} />
        ))}
      </View>
    </Animated.View>
  )
}

function StatPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: `${color}12`, borderRadius: radius.full,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1,
      borderWidth: 1, borderColor: `${color}25`,
    }}>
      <Text style={{ fontSize: 13, marginRight: 5 }}>{icon}</Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color }}>{label}</Text>
    </View>
  )
}

function ComingSoonCard({ opacity, translateY }: { opacity: Animated.SharedValue<number>; translateY: Animated.SharedValue<number> }) {
  const { colors } = useTheme()
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }))

  return (
    <Animated.View style={[{
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginHorizontal: spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
    }, style]}>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: `${colors.primary}15`,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
          <Text style={{ fontSize: 36 }}>🧭</Text>
        </View>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xs, letterSpacing: -0.3 }}>
          Discover is coming
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 }}>
          Smart skill matching based on what{'\n'}you teach and want to learn.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl }}>
        <StatPill icon="🎯" label="Smart Match"       color={colors.primary}   />
        <StatPill icon="📊" label="Compatibility Score" color={colors.secondary} />
        <StatPill icon="🔍" label="Browse & Filter"   color={colors.accent}    />
        <StatPill icon="📨" label="Swap Requests"      color="#F59E0B"          />
      </View>

      <View style={{ gap: spacing.sm }}>
        {[
          { icon: '✅', text: 'Mutual skill matching algorithm' },
          { icon: '✅', text: 'Availability-based scheduling' },
          { icon: '⏳', text: 'Phase 3 · Coming soon' },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, marginRight: spacing.sm, width: 22 }}>{item.icon}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary }}>{item.text}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  )
}

export default function DiscoverScreen() {
  const { colors } = useTheme()
  const { user }   = useAuth()

  const firstName = user?.profile?.firstName || user?.username || 'there'

  const headerOpacity = useSharedValue(0)
  const headerY       = useSharedValue(-10)
  const cardOpacity   = useSharedValue(0)
  const cardY         = useSharedValue(24)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 400 })
    headerY.value       = withSpring(0, { damping: 18 })
    cardOpacity.value   = withDelay(200, withTiming(1, { duration: 450 }))
    cardY.value         = withDelay(200, withSpring(0, { damping: 16 }))
  }, [])

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value, transform: [{ translateY: headerY.value }] }))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>

        {/* Header */}
        <Animated.View style={[{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.xl }, headerStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 2 }}>
                Good day,
              </Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>
                {firstName} 👋
              </Text>
            </View>
            <TouchableOpacity style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Shimmer preview cards */}
        <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.xl }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md }}>
            Preview · Coming Soon
          </Text>
          <ShimmerCard delay={0} />
          <ShimmerCard delay={150} />
          <ShimmerCard delay={300} />
        </View>

        {/* Coming soon card */}
        <ComingSoonCard opacity={cardOpacity} translateY={cardY} />
      </ScrollView>
    </SafeAreaView>
  )
}
