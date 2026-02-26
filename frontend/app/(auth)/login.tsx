import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, TextInput,
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

export default function LoginScreen() {
  const { colors } = useTheme()
  const router      = useRouter()
  const toast       = useToast()
  const passwordRef = useRef<TextInput>(null)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState<{ email?: string; password?: string; general?: string }>({})

  const clearField = (k: string) => setErrors(p => ({ ...p, [k]: undefined, general: undefined }))

  const validate = () => {
    const e: typeof errors = {}
    if (!email.trim())                     e.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email))  e.email    = 'Enter a valid email'
    if (!password)                         e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      await authService.login({ email: email.trim().toLowerCase(), password })
      toast.success('Welcome back! 👋')
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
            Welcome back 👋
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.textSecondary, marginBottom: spacing['2xl'], lineHeight: 22 }}>
            Sign in to continue your skill journey
          </Text>

          {/* Error banner */}
          {errors.general && (
            <View style={{
              backgroundColor: `${colors.error}15`, borderRadius: radius.md, padding: spacing.md,
              marginBottom: spacing.base, borderWidth: 1, borderColor: `${colors.error}35`,
              borderLeftWidth: 3, borderLeftColor: colors.error, flexDirection: 'row', alignItems: 'center',
            }}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.error, flex: 1 }}>
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
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          {/* Password */}
          <Input
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); clearField('password') }}
            placeholder="Your password"
            isPassword
            leftIcon="lock-closed-outline"
            error={errors.password}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity onPress={() => {}} style={{ alignSelf: 'flex-end', marginBottom: spacing.xl, marginTop: -spacing.sm }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.primary }}>Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary }}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.primary }}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
