import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { getLevelByValue } from '@/constants/skillLevels'
import api from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'

interface DiscoverUser {
  _id: string
  username: string
  profile: {
    firstName: string
    lastName: string
    bio: string
    avatarColor: string
  }
  teachSkills: { skillName: string; skillIcon: string; level: number }[]
  learnSkills: { skillName: string; skillIcon: string; targetLevel: number }[]
  reputation: { avgRating: number; totalSessions: number }
  matchScore: number
  sharedSkills: {
    skillName: string
    skillIcon: string
    direction: 'they_teach' | 'i_teach'
    theirLevel?: number
    myLevel?: number
  }[]
  scoreBreakdown?: {
    theyTeach: number
    iTeach: number
    mutualBonus: number
    sharedDepth: number
    reliability: number
    recency: number
    intent?: 'quick_lesson' | 'long_term_mentorship' | 'practice_buddy' | string
  }
}

interface PendingMatch {
  _id: string
  users: {
    _id: string
    username: string
    profile: { firstName: string; lastName: string; avatarColor: string }
  }[]
  initiator: string
  status: 'pending' | 'accepted' | 'rejected'
}

function SkillChip({ icon, name, level, color }: { icon: string; name: string; level: number; color: string }) {
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
  const recentlyActive = user.profile && (new Date().getTime() - new Date((user as any).profile?.lastActiveAt || Date.now()).getTime()) < (1000 * 60 * 60 * 48)

  const theyTeach = user.sharedSkills?.filter(s => s.direction === 'they_teach') || []
  const iTeach = user.sharedSkills?.filter(s => s.direction === 'i_teach') || []
  const isMutual = theyTeach.length > 0 && iTeach.length > 0
  const intentLabel = (user.scoreBreakdown?.intent || 'practice_buddy').replace(/_/g, ' ')

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
            {recentlyActive && (
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.success, marginTop: 2 }}>
                Active recently
              </Text>
            )}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <View style={{ backgroundColor: `${colors.primary}14`, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, marginRight: spacing.xs }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.primary }}>
              {intentLabel}
            </Text>
          </View>
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.textMuted }}>
              {user.sharedSkills?.length || 0} shared signals
            </Text>
          </View>
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

        {user.scoreBreakdown && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: spacing.xs }}>
              Why this match
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
              Teach fit {user.scoreBreakdown.theyTeach}, learn fit {user.scoreBreakdown.iTeach},
              mutual +{user.scoreBreakdown.mutualBonus}, reliability +{user.scoreBreakdown.reliability}
            </Text>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primary, marginTop: 4 }}>
              Recommended format: {intentLabel}
            </Text>
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
            activeOpacity={0.8}
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
            activeOpacity={0.85}
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

function MatchSkeleton() {
  const { colors } = useTheme()
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.base, padding: spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt }} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={{ width: '40%', height: 12, backgroundColor: colors.surfaceAlt, borderRadius: 6, marginBottom: spacing.xs }} />
          <View style={{ width: '25%', height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5 }} />
        </View>
      </View>
      <View style={{ width: '85%', height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, marginBottom: spacing.xs }} />
      <View style={{ width: '70%', height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1, height: 36, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} />
        <View style={{ flex: 2, height: 36, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} />
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
  const [pending, setPending] = useState<PendingMatch[]>([])
  const [sent, setSent] = useState<PendingMatch[]>([])
  const [matched, setMatched] = useState<PendingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDots, setLoadingDots] = useState('.')
  const [refreshing, setRefreshing] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const toast = useToast()

  const fetchDiscover = useCallback(async (silent = false) => {
    try {
      const [discoverRes, pendingRes, sentRes, acceptedRes] = await Promise.all([
        api.get('/discover?limit=20'),
        api.get('/matches/pending'),
        api.get('/matches?status=pending'),
        api.get('/matches?status=accepted'),
      ])
      setUsers(discoverRes.data.data?.users || [])
      const pendingList: PendingMatch[] = pendingRes.data.data || []
      setPending(pendingList)
      const allPending: PendingMatch[] = sentRes.data.data || []
      setSent(allPending.filter((m) => m.initiator === user?._id))
      setMatched(acceptedRes.data.data || [])
    } catch (err) {
      if (!silent) toast.error(getApiError(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast, user?._id])

  useEffect(() => { fetchDiscover() }, [fetchDiscover])
  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => {
      setLoadingDots((d) => (d.length >= 3 ? '.' : `${d}.`))
    }, 350)
    return () => clearInterval(id)
  }, [loading])

  const handleConnect = async (userId: string) => {
    setConnectingId(userId)
    try {
      await api.post(`/matches/connect/${userId}`)
      setUsers(prev => prev.filter(u => u._id !== userId))
      toast.success('Connection request sent!')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setConnectingId(null)
    }
  }

  const handleSkip = async (userId: string) => {
    setUsers(prev => prev.filter(u => u._id !== userId))
    try {
      await api.post(`/discover/skip/${userId}`)
    } catch {
      // non-critical
    }
  }

  const handleAccept = async (matchId: string) => {
    setActionLoadingId(matchId)
    try {
      await api.put(`/matches/${matchId}/accept`)
      setPending(prev => prev.filter(m => m._id !== matchId))
      toast.success('Connection accepted! You can now chat.')
    } catch (err) { toast.error(getApiError(err)) } finally { setActionLoadingId(null) }
  }

  const handleReject = async (matchId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this connection?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        setActionLoadingId(matchId)
        try {
          await api.put(`/matches/${matchId}/reject`)
          setPending(prev => prev.filter(m => m._id !== matchId))
        } catch (err) { toast.error(getApiError(err)) } finally { setActionLoadingId(null) }
      }},
    ])
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDiscover(true)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>
            Discover
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textMuted, marginTop: spacing.xs }}>
            Looking for your best matches{loadingDots}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.base }}>
          <MatchSkeleton />
          <MatchSkeleton />
          <MatchSkeleton />
          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </ScrollView>
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
          <View style={{
            backgroundColor: colors.primary,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            borderWidth: 1,
            borderColor: `${colors.primaryLight}80`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#E9EDFF', marginBottom: 2 }}>
                  Discover your next skill exchange
                </Text>
                <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#FFFFFF', letterSpacing: -0.5 }}>
                  {firstName} 👋
                </Text>
              </View>
              <TouchableOpacity style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.16)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{
            marginTop: spacing.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                Network Snapshot
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                Pending {pending.length} | Sent {sent.length} | Matched {matched.length}
              </Text>
            </View>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          </View>
        </View>

        {/* Pending requests */}
        {pending.length > 0 && (
          <Animated.View entering={FadeInDown.delay(40).duration(260)} style={{ paddingHorizontal: spacing.base, marginBottom: spacing.xl }}>
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
          </Animated.View>
        )}

        {/* Sent requests */}
        {sent.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(260)} style={{ paddingHorizontal: spacing.base, marginBottom: spacing.lg }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm }}>
              📤 Sent Requests ({sent.length})
            </Text>
            {sent.map((match) => {
              const other = match.users?.find((u) => u._id !== user?._id)
              if (!other) return null
              const name = other.profile?.firstName ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim() : other.username
              const avatarColor = other.profile?.avatarColor || getAvatarColor(other._id)
              return (
                <View key={match._id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.surfaceAlt, borderRadius: radius.lg,
                  padding: spacing.md, marginBottom: spacing.xs,
                  borderWidth: 1, borderColor: colors.border,
                }}>
                  <Avatar firstName={other.profile?.firstName || ''} lastName={other.profile?.lastName || other.username} color={avatarColor} size={36} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>{name}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>Request sent - waiting for response</Text>
                  </View>
                  <Ionicons name="time-outline" size={16} color={colors.warning} />
                </View>
              )
            })}
          </Animated.View>
        )}

        {matched.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).duration(260)} style={{ paddingHorizontal: spacing.base, marginBottom: spacing.lg }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.success, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm }}>
              ✅ Matched ({matched.length})
            </Text>
            {matched.slice(0, 3).map((match) => {
              const other = match.users?.find((u) => u._id !== user?._id)
              if (!other) return null
              const name = other.profile?.firstName ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim() : other.username
              const avatarColor = other.profile?.avatarColor || getAvatarColor(other._id)
              return (
                <View key={match._id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: `${colors.success}10`, borderRadius: radius.lg,
                  padding: spacing.md, marginBottom: spacing.xs,
                  borderWidth: 1, borderColor: `${colors.success}30`,
                }}>
                  <Avatar firstName={other.profile?.firstName || ''} lastName={other.profile?.lastName || other.username} color={avatarColor} size={36} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>{name}</Text>
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted }}>You can message and schedule sessions now</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                </View>
              )
            })}
          </Animated.View>
        )}

        {/* Discover results */}
        <Animated.View entering={FadeInUp.delay(160).duration(300)} style={{ paddingHorizontal: spacing.base }}>
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
                As more people join, you'll see skill matches here. Check "Sent Requests" above or pull down to refresh.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}
