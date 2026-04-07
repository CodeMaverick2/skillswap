import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import api from '@/services/api'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pending:   { label: 'Pending Confirmation', color: '#F59E0B', icon: '⏳', bg: '#F59E0B15' },
  confirmed: { label: 'Confirmed',            color: '#22C55E', icon: '✅', bg: '#22C55E15' },
  active:    { label: 'In Progress',          color: '#3B82F6', icon: '🔴', bg: '#3B82F615' },
  completed: { label: 'Completed',            color: '#6B7280', icon: '✓',  bg: '#6B728015' },
  cancelled: { label: 'Cancelled',            color: '#EF4444', icon: '✕',  bg: '#EF444415' },
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()
  const toast = useToast()

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Fetch all sessions and find the one we need
        const res = await api.get('/sessions')
        const all = [...(res.data.data?.upcoming || []), ...(res.data.data?.past || [])]
        const found = all.find((s: any) => s._id === id)
        setSession(found || null)
      } catch {
        toast.error('Failed to load session')
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [id])

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      await api.put(`/sessions/${id}/confirm`)
      setSession((prev: any) => prev ? { ...prev, status: 'confirmed' } : prev)
      toast.success('Session confirmed!')
    } catch (err) { toast.error(getApiError(err)) } finally { setActionLoading(false) }
  }

  const handleCancel = () => {
    Alert.alert('Cancel Session', 'Are you sure?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Session', style: 'destructive', onPress: async () => {
        setActionLoading(true)
        try {
          await api.put(`/sessions/${id}/cancel`)
          setSession((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev)
          toast.info('Session cancelled')
        } catch (err) { toast.error(getApiError(err)) } finally { setActionLoading(false) }
      }},
    ])
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await api.put(`/sessions/${id}/complete`)
      setSession((prev: any) => prev ? { ...prev, status: 'completed' } : prev)
      toast.success('Session marked as completed!')
    } catch (err) { toast.error(getApiError(err)) } finally { setActionLoading(false) }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: spacing.md }}>😕</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.textPrimary }}>Session not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.xl }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const other = session.participants?.find((p: any) => p._id !== user?._id)
  const otherName = other?.profile?.firstName
    ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim()
    : other?.username || 'Partner'
  const avatarColor = other?.profile?.avatarColor || getAvatarColor(other?._id || '')
  const statusInfo = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending
  const canConfirm = session.status === 'pending' && session.createdBy !== user?._id
  const canCancel = session.status === 'pending' || session.status === 'confirmed'
  const canComplete = session.status === 'confirmed'

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
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.textPrimary }}>Session Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}>
        {/* Status banner */}
        <View style={{
          backgroundColor: statusInfo.bg, borderRadius: radius.lg,
          padding: spacing.base, alignItems: 'center', marginBottom: spacing.xl,
          borderWidth: 1, borderColor: `${statusInfo.color}30`,
        }}>
          <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>{statusInfo.icon}</Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 18, color: statusInfo.color }}>{statusInfo.label}</Text>
        </View>

        {/* Partner */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.surface, borderRadius: radius.lg,
          padding: spacing.base, borderWidth: 1, borderColor: colors.border,
          marginBottom: spacing.md,
        }}>
          <Avatar firstName={other?.profile?.firstName || ''} lastName={other?.profile?.lastName || other?.username || ''} color={avatarColor} size={52} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary }}>{otherName}</Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>@{other?.username}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/user/${other?._id}`)}>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl,
          overflow: 'hidden',
        }}>
          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Details</Text>
          </View>

          {[
            { icon: 'document-text-outline' as const, label: 'Topic', value: session.topic },
            { icon: 'calendar-outline' as const, label: 'Date', value: format(new Date(session.scheduledAt), 'EEEE, MMMM d, yyyy') },
            { icon: 'time-outline' as const, label: 'Time', value: format(new Date(session.scheduledAt), 'h:mm a') },
            { icon: 'hourglass-outline' as const, label: 'Duration', value: `${session.duration} minutes` },
          ].map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: spacing.base, paddingVertical: spacing.md,
              borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border,
            }}>
              <Ionicons name={item.icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.md, width: 22 }} />
              <View>
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary }}>{item.value}</Text>
              </View>
            </View>
          ))}

          {session.notes ? (
            <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>Notes</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, lineHeight: 21 }}>{session.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={{ gap: spacing.sm }}>
          {canConfirm && (
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={actionLoading}
              style={{
                backgroundColor: colors.success, borderRadius: radius.md,
                paddingVertical: spacing.md, alignItems: 'center',
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Confirm Session</Text>
            </TouchableOpacity>
          )}
          {canComplete && (
            <TouchableOpacity
              onPress={handleComplete}
              disabled={actionLoading}
              style={{
                backgroundColor: colors.primary, borderRadius: radius.md,
                paddingVertical: spacing.md, alignItems: 'center',
                opacity: actionLoading ? 0.7 : 1,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              onPress={handleCancel}
              disabled={actionLoading}
              style={{
                borderWidth: 1.5, borderColor: `${colors.error}40`, borderRadius: radius.md,
                paddingVertical: spacing.md, alignItems: 'center',
                backgroundColor: `${colors.error}08`,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.error }}>Cancel Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
