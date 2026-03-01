import { useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

const STEPS = [
  { icon: '🤝', title: 'Match',    desc: 'Find a peer with complementary skills' },
  { icon: '💬', title: 'Chat',     desc: 'Agree on topics and pick a time'       },
  { icon: '📹', title: 'Connect',  desc: 'Video call on your platform of choice' },
  { icon: '⭐', title: 'Rate',     desc: 'Leave feedback and earn reputation'    },
]

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(16)

  useEffect(() => {
    opacity.value    = withDelay(200 + index * 80, withTiming(1,  { duration: 350 }))
    translateY.value = withDelay(200 + index * 80, withSpring(0,  { damping: 16 }))
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }))

  return (
    <Animated.View style={[{
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: radius.lg, padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    }, style]}>
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: `${colors.primary}12`,
        alignItems: 'center', justifyContent: 'center',
        marginRight: spacing.md, flexShrink: 0,
      }}>
        <Text style={{ fontSize: 20 }}>{step.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 2 }}>{step.title}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>{step.desc}</Text>
      </View>
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'center', marginLeft: spacing.sm,
      }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.primary }}>{index + 1}</Text>
      </View>
    </Animated.View>
  )
}

export default function SessionsScreen() {
  const { colors } = useTheme()
  const router     = useRouter()

  const heroOpacity = useSharedValue(0)
  const heroScale   = useSharedValue(0.85)
  const titleOpacity = useSharedValue(0)
  const titleY      = useSharedValue(12)

  useEffect(() => {
    heroOpacity.value  = withTiming(1,  { duration: 400 })
    heroScale.value    = withSpring(1,   { damping: 14, stiffness: 120 })
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 350 }))
    titleY.value       = withDelay(150, withSpring(0, { damping: 16 }))
  }, [])

  const heroStyle  = useAnimatedStyle(() => ({ opacity: heroOpacity.value, transform: [{ scale: heroScale.value }] }))
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleY.value }] }))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>Sessions</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 3 }}>
          Your upcoming and past skill sessions
        </Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Animated.View style={[{
            width: 88, height: 88, borderRadius: 44,
            backgroundColor: `${colors.primary}12`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.lg,
            borderWidth: 2, borderColor: `${colors.primary}20`,
          }, heroStyle]}>
            <Text style={{ fontSize: 44 }}>📅</Text>
          </Animated.View>

          <Animated.View style={[{ alignItems: 'center' }, titleStyle]}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm, letterSpacing: -0.3 }}>
              No sessions yet
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 270 }}>
              Sessions are created after you match with a skill partner and agree on a time.
            </Text>
          </Animated.View>
        </View>

        {/* How it works */}
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md }}>
          How it works
        </Text>
        {STEPS.map((step, i) => <StepCard key={i} step={step} index={i} />)}

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/discover')}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.primary, borderRadius: radius.lg,
            paddingVertical: spacing.md, marginTop: spacing.xl,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="compass-outline" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>
            Find a skill partner
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
