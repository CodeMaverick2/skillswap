import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { getLevelByValue } from '@/constants/skillLevels'
import api from '@/services/api'

interface DiscoverUser {
  _id: string
  username: string
  profile: {
    firstName: string
    lastName: string
    bio: string
    avatarColor: string
  }
  teachSkills: Array<{ skillName: string; skillIcon: string; level: number }>
  learnSkills: Array<{ skillName: string; skillIcon: string; targetLevel: number }>
  reputation: { avgRating: number; totalSessions: number }
  matchScore: number
  sharedSkills: Array<{
    skillName: string
    skillIcon: string
    direction: 'they_teach' | 'i_teach'
    theirLevel?: number
    myLevel?: number
  }>
}

function SkillChip({ icon, name, level, color }: { icon: string; name: string; level: number; color: string }) {
  const { colors } = useTheme()
  const levelInfo = getLevelByValue(level)
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: `${color}12`, borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs,
      borderWidth: 1, borderColor: `${color}25`,
    }}>
      <Text style={{ fontSize: 12, marginRight: 3 }}>{icon || '📚'}</Text>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color, marginRight: 4 }}>{name}</Text>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 9, color: levelInfo.color }}>{levelInfo.icon}</Text>
    </View>
  )
}

function MatchCard({
  user,
  onConnect,
  onSkip,
  connecting,
}: {
  user: DiscoverUser
  onConnect: () => void
  onSkip: () => void
  connecting: boolean
}) {
  const { colors } = useTheme()
  const firstName = user.profile?.firstName || ''
  const lastName = user.profile?.lastName || ''
  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : user.username
  const avatarColor = user.profile?.avatarColor || getAvatarColor(user._id || user.username)

  const theyTeach = user.sharedSkills?.filter(s => s.direction === 'they_teach') || []
  const iTeach = user.sharedSkills?.filter(s => s.direction === 'i_teach') || []
  const isMutual = theyTeach.length > 0 && iTeach.length > 0

  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.base,
      overflow: 'hidden',
    }}>
      {/* Match score badge */}
      {isMutual && (
        <View style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          alignItems: 'center',
        }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#fff' }}>
            🤝 Mutual Match · {user.matchScore} pts
          </Text>
        </View>
      )}

      <View style={{ padding: spacing.base }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Avatar firstName={firstName} lastName={lastName || user.username} color={avatarColor} size={48} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary }}>{fullName}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>@{user.username}</Text>
          </View>
          {user.reputation?.totalSessions > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${colors.warning}15`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, marginRight: 2 }}>⭐</Text>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.warning }}>
                {user.reputation.avgRating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {user.profile?.bio ? (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.md }} numberOfLines={2}>
            {user.profile.bio}
          </Text>
        ) : null}

        {/* They can teach you */}
        {theyTeach.length > 0 && (
          <View style={{ marginBottom: spacing.sm }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Can teach you
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {theyTeach.map((s, i) => (
                <SkillChip key={i} icon={s.skillIcon} name={s.skillName} level={s.theirLevel || 3} color={colors.primary} />
              ))}
            </View>
          </View>
        )}

        {/* Wants to learn from you */}
        {iTeach.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.accent, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Wants to learn from you
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {iTeach.map((s, i) => (
                <SkillChip key={i} icon={s.skillIcon} name={s.skillName} level={s.myLevel || 3} color={colors.accent} />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={onSkip}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Ionicons name="close-outline" size={18} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textMuted }}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConnect}
            disabled={connecting}
            style={{
              flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.primary, borderRadius: radius.md,
              paddingVertical: spacing.sm + 2, opacity: connecting ? 0.7 : 1,
            }}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="hand-right-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>Connect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function PendingRequestCard({
  match,
  myId,
  onAccept,
  onReject,
  loading,
}: {
  match: any
  myId: string
  onAccept: () => void
  onReject: () => void
  loading: boolean
}) {
  const { colors } = useTheme()
  const other = match.users?.find((u: any) => u._id !== myId)
  if (!other) return null
  const name = other.profile?.firstName ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim() : other.username
  const avatarColor = other.profile?.avatarColor || getAvatarColor(other._id)

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: radius.lg,
      padding: spacing.md, borderWidth: 1, borderColor: colors.border,
      marginBottom: spacing.sm,
    }}>
      <Avatar firstName={other.profile?.firstName || ''} lastName={other.profile?.lastName || other.username} color={avatarColor} size={40} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary }}>{name}</Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>Wants to connect</Text>
      </View>
      <TouchableOpacity onPress={onReject} disabled={loading} style={{ padding: spacing.sm }}>
        <Ionicons name="close-circle-outline" size={28} color={colors.error} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onAccept} disabled={loading} style={{ padding: spacing.sm }}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
      </TouchableOpacity>
    </View>
  )
}

export default function DiscoverScreen() {
  const { colors } = useTheme()
  const { user } = useAuthStore()
  const firstName = user?.profile?.firstName || user?.username || 'there'

  const [users, setUsers] = useState<DiscoverUser[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchDiscover = useCallback(async () => {
    try {
      const [discoverRes, pendingRes] = await Promise.all([
        api.get('/discover?limit=20'),
        api.get('/matches/pending'),
      ])
      setUsers(discoverRes.data.data?.users || [])
      setPending(pendingRes.data.data || [])
    } catch {
      // Silent fail — will show empty state
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchDiscover() }, [fetchDiscover])

  const handleConnect = async (userId: string) => {
    setConnectingId(userId)
    try {
      await api.post(`/matches/connect/${userId}`)
      setUsers(prev => prev.filter(u => u._id !== userId))
    } catch {
      // ignore — already connected or error
    } finally {
      setConnectingId(null)
    }
  }

  const handleSkip = async (userId: string) => {
    setUsers(prev => prev.filter(u => u._id !== userId))
    try {
      await api.post(`/discover/skip/${userId}`)
    } catch {
      // ignore
    }
  }

  const handleAccept = async (matchId: string) => {
    setActionLoadingId(matchId)
    try {
      await api.put(`/matches/${matchId}/accept`)
      setPending(prev => prev.filter(m => m._id !== matchId))
    } catch {} finally { setActionLoadingId(null) }
  }

  const handleReject = async (matchId: string) => {
    setActionLoadingId(matchId)
    try {
      await api.put(`/matches/${matchId}/reject`)
      setPending(prev => prev.filter(m => m._id !== matchId))
    } catch {} finally { setActionLoadingId(null) }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDiscover()
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, marginTop: spacing.md }}>Finding matches...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
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
        </View>

        {/* Pending requests */}
        {pending.length > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.xl }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.warning, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm }}>
              📩 {pending.length} Pending Request{pending.length > 1 ? 's' : ''}
            </Text>
            {pending.map((match: any) => (
              <PendingRequestCard
                key={match._id}
                match={match}
                myId={user?._id || ''}
                onAccept={() => handleAccept(match._id)}
                onReject={() => handleReject(match._id)}
                loading={actionLoadingId === match._id}
              />
            ))}
          </View>
        )}

        {/* Discover results */}
        <View style={{ paddingHorizontal: spacing.base }}>
          {users.length > 0 ? (
            <>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.md }}>
                Suggested for you
              </Text>
              {users.map(u => (
                <MatchCard
                  key={u._id}
                  user={u}
                  onConnect={() => handleConnect(u._id)}
                  onSkip={() => handleSkip(u._id)}
                  connecting={connectingId === u._id}
                />
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${colors.primary}12`,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: spacing.md,
              }}>
                <Text style={{ fontSize: 40 }}>🧭</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xs, textAlign: 'center' }}>
                No matches right now
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
                As more people join, you'll see skill matches here. Pull down to refresh!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
