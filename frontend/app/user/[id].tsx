import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { getLevelByValue } from '@/constants/skillLevels'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import api from '@/services/api'

interface PublicUser {
  _id: string
  username: string
  profile: { firstName: string; lastName: string; bio: string; avatarColor: string; timezone: string }
  teachSkills: Array<{ skillName: string; skillIcon: string; level: number }>
  learnSkills: Array<{ skillName: string; skillIcon: string; targetLevel: number }>
  reputation: { avgRating: number; totalSessions: number; completionRate: number }
  createdAt: string
}

function SkillChip({ icon, name, level }: { icon: string; name: string; level: number; color: string }) {
  const { colors } = useTheme()
  const levelInfo = getLevelByValue(level)
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surfaceAlt, borderRadius: radius.full,
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
      marginRight: spacing.sm, marginBottom: spacing.sm,
      borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 14, marginRight: 4 }}>{icon || '📚'}</Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary, marginRight: 6 }}>{name}</Text>
      <View style={{ backgroundColor: `${levelInfo.color}30`, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: levelInfo.color }}>
          {levelInfo.icon} {levelInfo.name}
        </Text>
      </View>
    </View>
  )
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const router = useRouter()
  const toast = useToast()

  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const goBackSafe = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/discover')
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/users/${id}`)
        setProfile(res.data.data)
      } catch {
        setError('User not found')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [id])

  const submitReport = async (reason: string) => {
    try {
      await api.post('/moderation/report', {
        targetType: 'user',
        targetUser: id,
        reason,
      })
      toast.success('Report submitted')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleBlock = () => {
    Alert.alert('Block user', 'They will no longer appear in discover or be able to message you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/moderation/block/${id}`)
            toast.success('User blocked')
            goBackSafe()
          } catch (err) {
            toast.error(getApiError(err))
          }
        },
      },
    ])
  }

  const handleReport = () => {
    Alert.alert('Report user', 'Why are you reporting this profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
      { text: 'Other', onPress: () => submitReport('other') },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>{error || 'User not found'}</Text>
        <TouchableOpacity onPress={goBackSafe} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const firstName = profile.profile?.firstName || ''
  const lastName = profile.profile?.lastName || ''
  const displayName = firstName || lastName ? `${firstName} ${lastName}`.trim() : profile.username
  const avatarColor = profile.profile?.avatarColor || getAvatarColor(profile._id)
  const reputation = profile.reputation || { avgRating: 0, totalSessions: 0, completionRate: 0 }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        }}>
          <TouchableOpacity onPress={goBackSafe}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={handleReport} style={{ padding: spacing.xs }}>
              <Ionicons name="flag-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBlock} style={{ padding: spacing.xs }}>
              <Ionicons name="ban-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Avatar
            firstName={firstName || profile.username}
            lastName={lastName || ''}
            color={avatarColor}
            size={80}
          />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary, marginTop: spacing.md }}>
            {displayName}
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted }}>
            @{profile.username}
          </Text>
          {profile.profile?.bio ? (
            <Text style={{
              fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary,
              textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl,
            }}>
              {profile.profile.bio}
            </Text>
          ) : null}
        </View>

        <View style={{
          flexDirection: 'row', marginHorizontal: spacing.base, marginBottom: spacing.xl,
          backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRightWidth: 1, borderRightColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary }}>
              {reputation.totalSessions || 0}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Sessions</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRightWidth: 1, borderRightColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary }}>
              {reputation.avgRating > 0 ? reputation.avgRating.toFixed(1) : '—'}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Rating</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary }}>
              {reputation.completionRate > 0 ? `${Math.round(reputation.completionRate)}%` : '—'}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Completion</Text>
          </View>
        </View>

        {(profile.teachSkills?.length || 0) > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md }}>
              Can Teach
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {profile.teachSkills.map((s, i) => (
                <SkillChip key={i} icon={s.skillIcon} name={s.skillName} level={s.level} color={colors.primary} />
              ))}
            </View>
          </View>
        )}

        {(profile.learnSkills?.length || 0) > 0 && (
          <View style={{ paddingHorizontal: spacing.base }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md }}>
              Wants to Learn
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {profile.learnSkills.map((s, i) => (
                <SkillChip key={i} icon={s.skillIcon} name={s.skillName} level={s.targetLevel} color={colors.accent} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
