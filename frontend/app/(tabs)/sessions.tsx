import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { useAuthStore } from '@/store/auth.store'
import api from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

interface SessionItem {
  _id: string
  participants: Array<{
    _id: string
    username: string
    profile: { firstName: string; lastName: string; avatarColor: string }
  }>
  scheduledAt: string
  duration: number
  topic: string
  notes: string
  status: string
  createdBy: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#F59E0B', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: '#22C55E', icon: '✅' },
  active:    { label: 'Active',    color: '#3B82F6', icon: '🔴' },
  completed: { label: 'Completed', color: '#6B7280', icon: '✓'  },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: '✕'  },
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow · ${format(date, 'h:mm a')}`
  return format(date, 'MMM d · h:mm a')
}

function SessionCard({
  session,
  myId,
  onConfirm,
  onCancel,
  actionLoading,
}: {
  session: SessionItem
  myId: string
  onConfirm: () => void
  onCancel: () => void
  actionLoading: boolean
}) {
  const { colors } = useTheme()
  const other = session.participants?.find(p => p._id !== myId)
  if (!other) return null

  const name = other.profile?.firstName
    ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim()
    : other.username
  const avatarColor = other.profile?.avatarColor || getAvatarColor(other._id)
  const statusInfo = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending
  const canConfirm = session.status === 'pending' && session.createdBy !== myId
  const canCancel = session.status === 'pending' || session.status === 'confirmed'
  const isOld = isPast(new Date(session.scheduledAt)) && session.status !== 'completed' && session.status !== 'cancelled'

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      marginBottom: spacing.sm, overflow: 'hidden',
    }}>
      {/* Status bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 1,
        backgroundColor: `${statusInfo.color}10`,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, marginRight: 4 }}>{statusInfo.icon}</Text>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: statusInfo.color }}>{statusInfo.label}</Text>
        </View>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted }}>
          {session.duration}min
        </Text>
      </View>

      <View style={{ padding: spacing.md }}>
        {/* Partner + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Avatar firstName={other.profile?.firstName || ''} lastName={other.profile?.lastName || other.username} color={avatarColor} size={40} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary }}>{name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: isOld ? colors.warning : colors.textMuted }}>
                {formatSessionDate(session.scheduledAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Topic */}
        <View style={{
          backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
          paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1,
          marginBottom: spacing.sm,
        }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary }} numberOfLines={2}>
            📝 {session.topic}
          </Text>
        </View>

        {/* Actions */}
        {(canConfirm || canCancel) && (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {canCancel && (
              <TouchableOpacity
                onPress={onCancel}
                disabled={actionLoading}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.xs + 2,
                  borderRadius: radius.sm, borderWidth: 1, borderColor: `${colors.error}40`,
                  backgroundColor: `${colors.error}08`,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.error }}>Cancel</Text>
              </TouchableOpacity>
            )}
            {canConfirm && (
              <TouchableOpacity
                onPress={onConfirm}
                disabled={actionLoading}
                style={{
                  flex: 2, alignItems: 'center', paddingVertical: spacing.xs + 2,
                  borderRadius: radius.sm, backgroundColor: colors.success,
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#fff' }}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

export default function SessionsScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()

  const [upcoming, setUpcoming] = useState<SessionItem[]>([])
  const [past, setPast] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const toast = useToast()

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/sessions')
      setUpcoming(res.data.data?.upcoming || [])
      setPast(res.data.data?.past || [])
    } catch (err) {
      if (!refreshing) toast.error(getApiError(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleConfirm = async (sessionId: string) => {
    setActionLoadingId(sessionId)
    try {
      await api.put(`/sessions/${sessionId}/confirm`)
      toast.success('Session confirmed!')
      fetchSessions()
    } catch (err) { toast.error(getApiError(err)) } finally { setActionLoadingId(null) }
  }

  const handleCancel = async (sessionId: string) => {
    Alert.alert('Cancel Session', 'Are you sure you want to cancel this session?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Session', style: 'destructive', onPress: async () => {
        setActionLoadingId(sessionId)
        try {
          await api.put(`/sessions/${sessionId}/cancel`)
          toast.info('Session cancelled')
          fetchSessions()
        } catch (err) { toast.error(getApiError(err)) } finally { setActionLoadingId(null) }
      }},
    ])
  }

  const displaySessions = activeTab === 'upcoming' ? upcoming : past

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>Sessions</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.base, marginBottom: spacing.md }}>
        {(['upcoming', 'past'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? colors.primary : colors.border,
            }}
          >
            <Text style={{
              fontFamily: activeTab === tab ? 'Inter_600SemiBold' : 'Inter_400Regular',
              fontSize: 14,
              color: activeTab === tab ? colors.primary : colors.textMuted,
              textTransform: 'capitalize',
            }}>
              {tab} {tab === 'upcoming' && upcoming.length > 0 ? `(${upcoming.length})` : tab === 'past' && past.length > 0 ? `(${past.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions() }} tintColor={colors.primary} />}
      >
        {displaySessions.length > 0 ? (
          displaySessions.map(session => (
            <SessionCard
              key={session._id}
              session={session}
              myId={user?._id || ''}
              onConfirm={() => handleConfirm(session._id)}
              onCancel={() => handleCancel(session._id)}
              actionLoading={actionLoadingId === session._id}
            />
          ))
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'] }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: `${colors.primary}12`,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.md,
            }}>
              <Text style={{ fontSize: 36 }}>{activeTab === 'upcoming' ? '📅' : '📋'}</Text>
            </View>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.textPrimary, marginBottom: spacing.xs }}>
              No {activeTab} sessions
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260 }}>
              {activeTab === 'upcoming'
                ? 'Sessions will appear here when you schedule them with a match.'
                : 'Your completed and cancelled sessions will show here.'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/discover')}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  marginTop: spacing.xl,
                  backgroundColor: colors.primary, borderRadius: radius.lg,
                  paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="compass-outline" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Find Partners</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
