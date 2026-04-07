import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'

export default function EditProfileScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()
  const { user, setUser } = useAuthStore()

  const [firstName, setFirstName] = useState(user?.profile?.firstName || '')
  const [lastName, setLastName] = useState(user?.profile?.lastName || '')
  const [bio, setBio] = useState(user?.profile?.bio || '')
  const [timezone, setTimezone] = useState(user?.profile?.timezone || 'Asia/Kolkata')
  const [saving, setSaving] = useState(false)

  const hasChanges =
    firstName !== (user?.profile?.firstName || '') ||
    lastName !== (user?.profile?.lastName || '') ||
    bio !== (user?.profile?.bio || '') ||
    timezone !== (user?.profile?.timezone || 'Asia/Kolkata')

  const handleSave = async () => {
    if (!firstName.trim()) { toast.error('First name is required'); return }
    if (!lastName.trim()) { toast.error('Last name is required'); return }

    setSaving(true)
    try {
      const res = await api.put('/users/me', {
        profile: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio.trim(),
          timezone: timezone.trim() || 'Asia/Kolkata',
        },
      })
      setUser(res.data.data)
      toast.success('Profile updated!')
      router.back()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert('Discard Changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ])
    } else {
      router.back()
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.base, paddingVertical: spacing.md,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textPrimary }}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || !hasChanges} style={{ opacity: hasChanges ? 1 : 0.4 }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.primary }}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
            <View style={{ flex: 1 }}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                autoCapitalize="words"
                leftIcon="person-outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary }}>
                Bio
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: bio.length > 180 ? colors.warning : colors.textMuted }}>
                {bio.length}/200
              </Text>
            </View>
            <View style={{
              backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
              borderWidth: 1.5, borderColor: colors.border,
              paddingHorizontal: spacing.md, paddingVertical: spacing.md,
            }}>
              <TextInput
                value={bio}
                onChangeText={t => { if (t.length <= 200) setBio(t) }}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                textAlignVertical="top"
                style={{
                  fontFamily: 'Inter_400Regular', fontSize: 15,
                  color: colors.textPrimary, minHeight: 90, lineHeight: 22,
                }}
                selectionColor={colors.primary}
              />
            </View>
          </View>

          {/* Timezone */}
          <Input
            label="Timezone"
            value={timezone}
            onChangeText={setTimezone}
            placeholder="Asia/Kolkata"
            leftIcon="globe-outline"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Skills shortcut */}
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary, marginBottom: spacing.md }}>
              Skills
            </Text>
            <View style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 16, marginRight: spacing.sm }}>🎓</Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary }}>
                  Teaching {user?.teachSkills?.length || 0} skills
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: spacing.sm }}>🌱</Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary }}>
                  Learning {user?.learnSkills?.length || 0} skills
                </Text>
              </View>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: spacing.sm }}>
                To update skills, go through onboarding again from settings.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
