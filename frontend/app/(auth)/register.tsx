import { useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/auth.service'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import { spacing, radius } from '@/theme/spacing'

interface FormErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  general?: string
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score: 1, label: 'Weak',   color: '#EF4444' }
  if (score === 2) return { score: 2, label: 'Fair',   color: '#F97316' }
  if (score === 3) return { score: 3, label: 'Good',   color: '#EAB308' }
  return              { score: 4, label: 'Strong', color: '#22C55E' }
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { colors } = useTheme()
  const { score, label, color } = getPasswordStrength(password)
  if (!password) return null

  return (
    <View style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= score ? color : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color }}>
        {label} password
      </Text>
    </View>
  )
}

export default function RegisterScreen() {
  const { colors } = useTheme()
  const router     = useRouter()
  const toast      = useToast()

  const usernameRef        = useRef<TextInput>(null)
  const passwordRef        = useRef<TextInput>(null)
  const confirmPasswordRef = useRef<TextInput>(null)

  const [email,           setEmail]           = useState('')
  const [username,        setUsername]        = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [errors,          setErrors]          = useState<FormErrors>({})

  const clearField = (k: string) => setErrors(p => ({ ...p, [k]: undefined, general: undefined }))

  const validate = (): boolean => {
    const e: FormErrors = {}

    if (!email.trim())                    e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = 'Enter a valid email address'

    if (!username.trim())                              e.username = 'Username is required'
    else if (username.trim().length < 3)               e.username = 'Must be at least 3 characters'
    else if (username.trim().length > 30)              e.username = 'Must be 30 characters or less'
    else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) e.username = 'Letters, numbers, and underscores only'

    if (!password)            e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Must be at least 6 characters'

    if (!confirmPassword)              e.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      await authService.register({
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
        confirmPassword,
      })
      toast.success('Account created! Let\'s set up your profile 🎉')
      // AuthGate in _layout.tsx handles navigation to onboarding
    } catch (err) {
      setErrors({ general: getApiError(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.base }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: spacing.base, marginBottom: spacing.xl, alignSelf: 'flex-start',
              padding: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.textPrimary, marginBottom: spacing.xs, letterSpacing: -0.4 }}>
            Create account ✨
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary, marginBottom: spacing['2xl'], lineHeight: 22 }}>
            Join thousands of learners and teachers
          </Text>

          {/* Error banner */}
          {errors.general && (
            <View style={{
              backgroundColor: `${colors.error}15`, borderRadius: radius.md, padding: spacing.md,
              marginBottom: spacing.base, borderWidth: 1, borderColor: `${colors.error}35`,
              borderLeftWidth: 3, borderLeftColor: colors.error, flexDirection: 'row', alignItems: 'center',
            }}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.error, flex: 1, lineHeight: 20 }}>
                {errors.general}
              </Text>
            </View>
          )}

          {/* Email */}
          <Input
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); clearField('email') }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail-outline"
            error={errors.email}
            returnKeyType="next"
            onSubmitEditing={() => usernameRef.current?.focus()}
            blurOnSubmit={false}
          />

          {/* Username */}
          <Input
            ref={usernameRef}
            label="Username"
            value={username}
            onChangeText={(t) => { setUsername(t); clearField('username') }}
            placeholder="your_username"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="at-outline"
            error={errors.username}
            hint="Letters, numbers, and underscores (3–30 chars)"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          {/* Password */}
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); clearField('password') }}
            placeholder="Min. 6 characters"
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.password}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <PasswordStrengthBar password={password} />

          {/* Confirm Password */}
          <Input
            ref={confirmPasswordRef}
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearField('confirmPassword') }}
            placeholder="Re-enter your password"
            isPassword
            leftIcon="shield-checkmark-outline"
            error={errors.confirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          {/* Terms */}
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl, lineHeight: 18 }}>
            By creating an account, you agree to our{' '}
            <Text style={{ color: colors.primary }}>Terms of Service</Text>
            {' and '}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>

          <Button title="Create Account" onPress={handleRegister} loading={loading} disabled={loading} fullWidth size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary }}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primary }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
