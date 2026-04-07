import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { getLevelByValue } from '@/constants/skillLevels'
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

function SkillChip({ icon, name, level, color }: { icon: string; name: string; level: number; color: string }) {
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

  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/users/${id}`)
        setProfile(res.data.data)
      } catch {
        setError('User not found')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

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
        <Text style={{ fontSize: 40, marginBottom: spacing.md }}>😕</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.textPrimary }}>{error || 'User not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.xl }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const firstName = profile.profile?.firstName || ''
  const lastName = profile.profile?.lastName || ''
  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : profile.username
  const avatarColor = profile.profile?.avatarColor || getAvatarColor(profile._id)
  const reputation = profile.reputation || { avgRating: 0, totalSessions: 0, completionRate: 0 }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textPrimary }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Avatar firstName={firstName} lastName={lastName || profile.username} color={avatarColor} size={88} />
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary, marginTop: spacing.md }}>{fullName}</Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.primary, marginTop: 4 }}>@{profile.username}</Text>
          {profile.profile?.bio ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm, paddingHorizontal: spacing.xl }}>
              {profile.profile.bio}
            </Text>
          ) : null}
        </View>

        {/* Stats */}
        <View style={{
          marginHorizontal: spacing.base, backgroundColor: colors.surface,
          borderRadius: radius.lg, flexDirection: 'row',
          borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, overflow: 'hidden',
        }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary }}>{reputation.totalSessions}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Sessions</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.textPrimary }}>
              {reputation.avgRating > 0 ? `${reputation.avgRating.toFixed(1)}★` : '—'}
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

        {/* Teach skills */}
        {(profile.teachSkills?.length || 0) > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md }}>
              🎓 Can Teach
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {profile.teachSkills.map((s, i) => (
                <SkillChip key={i} icon={s.skillIcon} name={s.skillName} level={s.level} color={colors.primary} />
              ))}
            </View>
          </View>
        )}

        {/* Learn skills */}
        {(profile.learnSkills?.length || 0) > 0 && (
          <View style={{ paddingHorizontal: spacing.base }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: spacing.md }}>
              🌱 Wants to Learn
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
