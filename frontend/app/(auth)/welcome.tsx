import { useEffect } from 'react'
import { View, Text, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/ui/Button'
import { spacing, radius } from '@/theme/spacing'

const { width } = Dimensions.get('window')

const SKILL_BUBBLES = [
  { icon: '🐍', label: 'Python',        left: 16,          top: 0   },
  { icon: '🎸', label: 'Guitar',        right: 16,         top: 10  },
  { icon: '🌍', label: 'Spanish',       left: width/2-52,  top: 68  },
  { icon: '🎨', label: 'Design',        left: 10,          top: 124 },
  { icon: '⚛️', label: 'React Native',  right: 6,          top: 106 },
]

function FloatingBubble({
  icon, label, left, right, top, delay,
}: {
  icon: string; label: string; left?: number; right?: number; top: number; delay: number
}) {
  const { colors } = useTheme()
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(18)

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }))
    translateY.value = withDelay(delay, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }))

    const startFloat = () => {
      translateY.value = withSequence(
        withTiming(-7, { duration: 2200 + (delay % 500), easing: Easing.inOut(Easing.ease) }),
        withTiming(0,  { duration: 2200 + (delay % 500), easing: Easing.inOut(Easing.ease) }),
      )
    }
    const t = setTimeout(startFloat, delay + 700)
    const iv = setInterval(startFloat, 4400 + delay % 800)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [])

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top,
          ...(left !== undefined ? { left } : {}),
          ...(right !== undefined ? { right } : {}),
          backgroundColor: colors.surface,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 7,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 4,
        },
        bubbleStyle,
      ]}
    >
      <Text style={{ fontSize: 15, marginRight: 5 }}>{icon}</Text>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.textPrimary }}>
        {label}
      </Text>
    </Animated.View>
  )
}

export default function WelcomeScreen() {
  const { colors } = useTheme()
  const router = useRouter()

  const logoOpacity  = useSharedValue(0)
  const logoScale    = useSharedValue(0.5)
  const titleOpacity = useSharedValue(0)
  const titleY       = useSharedValue(20)
  const tagOpacity   = useSharedValue(0)
  const tagY         = useSharedValue(16)
  const btnOpacity   = useSharedValue(0)
  const btnY         = useSharedValue(28)

  useEffect(() => {
    logoOpacity.value  = withTiming(1, { duration: 500 })
    logoScale.value    = withSpring(1, { damping: 13, stiffness: 130 })
    titleOpacity.value = withDelay(320, withTiming(1, { duration: 450 }))
    titleY.value       = withDelay(320, withSpring(0, { damping: 16 }))
    tagOpacity.value   = withDelay(560, withTiming(1, { duration: 400 }))
    tagY.value         = withDelay(560, withSpring(0, { damping: 16 }))
    btnOpacity.value   = withDelay(820, withTiming(1, { duration: 380 }))
    btnY.value         = withDelay(820, withSpring(0, { damping: 16 }))
  }, [])

  const logoStyle  = useAnimatedStyle(() => ({ opacity: logoOpacity.value,  transform: [{ scale: logoScale.value        }] }))
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleY.value       }] }))
  const tagStyle   = useAnimatedStyle(() => ({ opacity: tagOpacity.value,   transform: [{ translateY: tagY.value         }] }))
  const btnStyle   = useAnimatedStyle(() => ({ opacity: btnOpacity.value,   transform: [{ translateY: btnY.value         }] }))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: spacing.xl }}>

        {/* ── Hero ─────────────────────────────────────── */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

          {/* Bubble area + logo */}
          <View style={{ width: '100%', height: 210, marginBottom: spacing.xl, position: 'relative' }}>
            {SKILL_BUBBLES.map((b, i) => (
              <FloatingBubble key={b.label} {...b} delay={150 + i * 100} />
            ))}
            <View style={{ position: 'absolute', bottom: -4, left: 0, right: 0, alignItems: 'center' }}>
              <Animated.View
                style={[
                  {
                    width: 84,
                    height: 84,
                    borderRadius: 26,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.45,
                    shadowRadius: 22,
                    elevation: 18,
                  },
                  logoStyle,
                ]}
              >
                <Text style={{ fontSize: 40 }}>🔄</Text>
              </Animated.View>
            </View>
          </View>

          {/* App name */}
          <Animated.Text
            style={[
              { fontFamily: 'Inter_800ExtraBold', fontSize: 42, color: colors.textPrimary, letterSpacing: -1.2, marginBottom: spacing.sm },
              titleStyle,
            ]}
          >
            SkillSwap
          </Animated.Text>

          {/* Tagline */}
          <Animated.View style={[{ alignItems: 'center' }, tagStyle]}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted,
                letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: spacing.md,
              }}
            >
              Teach · Learn · Grow
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary,
                textAlign: 'center', lineHeight: 24, maxWidth: 270,
              }}
            >
              Exchange skills with peers.{'\n'}No money. Just knowledge.
            </Text>
          </Animated.View>
        </View>

        {/* ── Bottom CTA ──────────────────────────────── */}
        <Animated.View style={[{ paddingBottom: spacing['2xl'] }, btnStyle]}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xl }}>
            {['🎯 Smart Match', '💬 Live Chat', '📅 Easy Schedule'].map((f) => (
              <View
                key={f}
                style={{
                  backgroundColor: colors.surfaceAlt, borderRadius: radius.full,
                  paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary }}>{f}</Text>
              </View>
            ))}
          </View>

          <Button title="Get Started" onPress={() => router.push('/(auth)/register')} fullWidth size="lg" style={{ marginBottom: spacing.md }} />
          <Button title="Sign In"     onPress={() => router.push('/(auth)/login')}    fullWidth size="lg" variant="outline" />

          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }}>
            By signing up you agree to our Terms & Privacy Policy
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}
