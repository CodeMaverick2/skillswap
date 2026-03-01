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
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

const FEATURES = [
  { icon: '⚡', label: 'Real-time messaging',         color: '#6C63FF' },
  { icon: '📎', label: 'Share resources & links',      color: '#43D9AD' },
  { icon: '📅', label: 'Propose session times inline', color: '#F59E0B' },
  { icon: '🔔', label: 'Push notifications',           color: '#FF6584' },
]

function PulseDot({ color, delay }: { color: string; delay: number }) {
  const scale   = useSharedValue(1)
  const opacity = useSharedValue(0.7)

  useEffect(() => {
    scale.value   = withDelay(delay, withRepeat(withSequence(withTiming(1.3, { duration: 700, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 700 })), -1))
    opacity.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1))
  }, [])

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }))

  return (
    <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />
  )
}

function BubblePreview({ side, delay }: { side: 'left' | 'right'; delay: number }) {
  const { colors } = useTheme()
  const opacity    = useSharedValue(0)
  const translateX = useSharedValue(side === 'left' ? -20 : 20)

  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(1, { duration: 400 }))
    translateX.value = withDelay(delay, withSpring(0, { damping: 16 }))
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: translateX.value }] }))

  const isRight = side === 'right'
  return (
    <Animated.View style={[{ alignItems: isRight ? 'flex-end' : 'flex-start', marginBottom: spacing.sm }, style]}>
      <View style={{
        backgroundColor: isRight ? colors.primary : colors.surface,
        borderRadius: 16,
        borderBottomRightRadius: isRight ? 4 : 16,
        borderBottomLeftRadius: isRight ? 16 : 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxWidth: '70%',
        borderWidth: isRight ? 0 : 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 13,
          color: isRight ? '#fff' : colors.textSecondary,
          lineHeight: 19,
        }}>
          {isRight ? 'Can you teach me Python? 🐍' : 'Sure! I can teach basics in exchange for Guitar lessons 🎸'}
        </Text>
      </View>
    </Animated.View>
  )
}

export default function MessagesScreen() {
  const { colors } = useTheme()
  const router     = useRouter()

  const headerOpacity = useSharedValue(0)
  const headerY       = useSharedValue(-8)

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 350 })
    headerY.value       = withSpring(0, { damping: 18 })
  }, [])

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value, transform: [{ translateY: headerY.value }] }))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>Messages</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 3 }}>
              Your conversations
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulseDot color={colors.primary} delay={0}   />
            <PulseDot color={colors.accent}  delay={200} />
            <PulseDot color={colors.secondary} delay={400} />
          </View>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
        {/* Chat bubble preview */}
        <Animated.View style={[{
          backgroundColor: colors.surface,
          borderRadius: radius.xl, padding: spacing.base,
          borderWidth: 1, borderColor: colors.border,
          marginBottom: spacing.xl,
        }, headerStyle]}>
          <BubblePreview side="right" delay={200} />
          <BubblePreview side="left"  delay={500} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginRight: spacing.sm }} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Coming in Phase 2</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginLeft: spacing.sm }} />
          </View>
        </Animated.View>

        {/* Empty state */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: `${colors.secondary}12`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <Text style={{ fontSize: 36 }}>💬</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}>
            No conversations yet
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
            Start by finding a skill partner in Discover, then message them directly.
          </Text>
        </View>

        {/* Features list */}
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md }}>
          What's coming
        </Text>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
          {FEATURES.map((f, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: radius.md,
              padding: spacing.md, borderWidth: 1, borderColor: colors.border,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: `${f.color}15`,
                alignItems: 'center', justifyContent: 'center',
                marginRight: spacing.md,
              }}>
                <Text style={{ fontSize: 18 }}>{f.icon}</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textSecondary, flex: 1 }}>{f.label}</Text>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/discover')}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: colors.primary,
            borderRadius: radius.lg, paddingVertical: spacing.md,
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="compass-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.primary }}>
            Go to Discover
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
