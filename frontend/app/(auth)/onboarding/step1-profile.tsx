import React, { useState } from 'react'
import {
  View,
  Text,
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
import { spacing, radius } from '@/theme/spacing'
import api from '@/services/api'
import { useAuthStore } from '@/store/auth.store'

// Step progress indicator component
function StepProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing['2xl'],
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: i < current ? colors.primary : 'transparent',
              borderWidth: 2,
              borderColor: i < current ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i < current - 1 ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : i === current - 1 ? (
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 14,
                  color: 'white',
                }}
              >
                {i + 1}
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < total - 1 && (
            <View
              style={{
                flex: 1,
                height: 2,
                backgroundColor:
                  i < current - 1 ? colors.primary : colors.border,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

interface FormErrors {
  firstName?: string
  lastName?: string
  general?: string
}

export default function Step1ProfileScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [firstName, setFirstName] = useState(user?.profile?.firstName || '')
  const [lastName, setLastName] = useState(user?.profile?.lastName || '')
  const [bio, setBio] = useState(user?.profile?.bio || '')
  const [timezone, setTimezone] = useState(
    user?.profile?.timezone || 'Asia/Kolkata'
  )
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [bioFocused, setBioFocused] = useState(false)
  const [timezoneFocused, setTimezoneFocused] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      const response = await api.put('/users/me', {
        profile: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio.trim(),
          timezone: timezone.trim() || 'Asia/Kolkata',
        },
      })
      setUser(response.data.data)
      router.push('/(auth)/onboarding/step2-teach')
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } }
      const message =
        axiosError.response?.data?.message || 'Failed to save profile. Please try again.'
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: spacing.base,
            paddingTop: spacing.xl,
            paddingBottom: spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step progress */}
          <StepProgress current={1} total={3} />

          {/* Title */}
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 26,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              letterSpacing: -0.3,
            }}
          >
            Tell us about yourself
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.textMuted,
              marginBottom: spacing['2xl'],
              lineHeight: 22,
            }}
          >
            This helps people know who you are
          </Text>

          {/* General error */}
          {errors.general && (
            <View
              style={{
                backgroundColor: `${colors.error}18`,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.base,
                borderWidth: 1,
                borderColor: `${colors.error}40`,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.error}
                style={{ marginRight: spacing.sm }}
              />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: colors.error,
                  flex: 1,
                }}
              >
                {errors.general}
              </Text>
            </View>
          )}

          {/* First name + Last name side by side */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginBottom: spacing.xs,
                }}
              >
                First Name
              </Text>
              <View
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: errors.firstName ? colors.error : colors.border,
                  paddingHorizontal: spacing.md,
                  minHeight: 52,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="John"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 15,
                    color: colors.textPrimary,
                    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
                  }}
                  selectionColor={colors.primary}
                  autoCapitalize="words"
                />
              </View>
              {errors.firstName && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: colors.error,
                    marginTop: spacing.xs,
                  }}
                >
                  {errors.firstName}
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: colors.textSecondary,
                  marginBottom: spacing.xs,
                }}
              >
                Last Name
              </Text>
              <View
                style={{
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: errors.lastName ? colors.error : colors.border,
                  paddingHorizontal: spacing.md,
                  minHeight: 52,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 15,
                    color: colors.textPrimary,
                    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
                  }}
                  selectionColor={colors.primary}
                  autoCapitalize="words"
                />
              </View>
              {errors.lastName && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: colors.error,
                    marginTop: spacing.xs,
                  }}
                >
                  {errors.lastName}
                </Text>
              )}
            </View>
          </View>

          {/* Bio */}
          <View style={{ marginBottom: spacing.base }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.xs,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                Bio{' '}
                <Text style={{ color: colors.textMuted }}>(optional)</Text>
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: bio.length > 180 ? colors.warning : colors.textMuted,
                }}
              >
                {bio.length}/200
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: bioFocused ? colors.primary : colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
              }}
            >
              <TextInput
                value={bio}
                onChangeText={(text) => {
                  if (text.length <= 200) setBio(text)
                }}
                placeholder="Tell others what you do, your interests, or what you love learning..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: colors.textPrimary,
                  minHeight: 90,
                  lineHeight: 22,
                }}
                selectionColor={colors.primary}
                onFocus={() => setBioFocused(true)}
                onBlur={() => setBioFocused(false)}
              />
            </View>
          </View>

          {/* Timezone */}
          <View style={{ marginBottom: spacing['2xl'] }}>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}
            >
              Timezone
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: timezoneFocused ? colors.primary : colors.border,
                paddingHorizontal: spacing.md,
                minHeight: 52,
              }}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={timezoneFocused ? colors.primary : colors.textMuted}
                style={{ marginRight: spacing.sm }}
              />
              <TextInput
                value={timezone}
                onChangeText={setTimezone}
                placeholder="Asia/Kolkata"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: colors.textPrimary,
                  paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
                }}
                selectionColor={colors.primary}
                onFocus={() => setTimezoneFocused(true)}
                onBlur={() => setTimezoneFocused(false)}
              />
            </View>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 12,
                color: colors.textMuted,
                marginTop: spacing.xs,
              }}
            >
              Used for scheduling sessions with matches
            </Text>
          </View>

          <Button
            title="Next →"
            onPress={handleNext}
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
