import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Linking } from 'react-native'
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
  const goBackSafe = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/sessions')
  }

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [note, setNote] = useState('')
  const [feedbackScore, setFeedbackScore] = useState('5')
  const [feedbackComment, setFeedbackComment] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [rescheduleAt, setRescheduleAt] = useState('')
  const [qualityScore, setQualityScore] = useState('4')

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/sessions/${id}`)
        const found = res.data.data
        setSession(found || null)
        if (found?.participantNotes?.[user?._id || '']) {
          setNote(found.participantNotes[user?._id || ''])
        }
      } catch {
        try {
          const res = await api.get('/sessions')
          const all = [...(res.data.data?.upcoming || []), ...(res.data.data?.past || [])]
          setSession(all.find((s: any) => s._id === id) || null)
        } catch {
          toast.error('Failed to load session')
        }
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

  const handleSaveNote = async () => {
    try {
      await api.put(`/sessions/${id}/notes`, { note })
      toast.success('Notes saved')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleSubmitFeedback = async () => {
    try {
      await api.put(`/sessions/${id}/feedback`, {
        score: Number(feedbackScore) || 5,
        comment: feedbackComment,
        nextSteps,
      })
      toast.success('Feedback submitted')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleAt.trim()) {
      toast.error('Enter new time (YYYY-MM-DD HH:mm)')
      return
    }
    const parsed = new Date(rescheduleAt.trim())
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      toast.error('Enter a valid future date')
      return
    }
    setActionLoading(true)
    try {
      const res = await api.put(`/sessions/${id}/reschedule`, {
        scheduledAt: parsed.toISOString(),
        reason: 'Rescheduled from app',
      })
      setSession(res.data.data)
      setRescheduleAt('')
      toast.success('Session rescheduled')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportCalendar = async () => {
    try {
      const res = await api.get(`/sessions/${id}/calendar.ics`, { responseType: 'text' })
      const ics = typeof res.data === 'string' ? res.data : String(res.data)
      const blobUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
      await Linking.openURL(blobUrl)
      toast.success('Calendar file ready')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const toggleChecklistItem = async (index: number) => {
    if (!session?.checklist) return
    const next = session.checklist.map((c: any, i: number) =>
      i === index ? { ...c, done: !c.done } : c
    )
    try {
      const res = await api.put(`/sessions/${id}/checklist`, { checklist: next })
      setSession(res.data.data)
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleMatchQuality = async () => {
    const matchId = session?.matchId?._id || session?.matchId
    if (!matchId) return
    try {
      await api.put(`/matches/${matchId}/quality`, { qualityScore: Number(qualityScore) || 4 })
      toast.success('Match quality saved')
    } catch (err) {
      toast.error(getApiError(err))
    }
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
        <TouchableOpacity onPress={goBackSafe} style={{ marginTop: spacing.xl }}>
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
  const handleOpenMeeting = async () => {
    const url = session.meetingLink || 'https://meet.google.com/new'
    const supported = await Linking.canOpenURL(url)
    if (!supported) {
      toast.error('Invalid meeting link')
      return
    }
    await Linking.openURL(url)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity onPress={goBackSafe} style={{ marginRight: spacing.md }}>
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

          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>Meeting link</Text>
            <TouchableOpacity onPress={handleOpenMeeting} style={{ alignSelf: 'flex-start', backgroundColor: `${colors.primary}12`, borderWidth: 1, borderColor: `${colors.primary}30`, borderRadius: radius.md, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primary }}>
                Join meeting
              </Text>
            </TouchableOpacity>
          </View>
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
          <TouchableOpacity
            onPress={handleExportCalendar}
            style={{
              borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
              paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.surface,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.textPrimary }}>Export to calendar (.ics)</Text>
          </TouchableOpacity>
        </View>

        {canCancel && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl, padding: spacing.base,
          }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm }}>
              Reschedule
            </Text>
            <TextInput
              value={rescheduleAt}
              onChangeText={setRescheduleAt}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, color: colors.textPrimary, marginBottom: spacing.sm,
              }}
            />
            <TouchableOpacity onPress={handleReschedule} disabled={actionLoading}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>Save new time</Text>
            </TouchableOpacity>
          </View>
        )}

        {(session.checklist?.length || 0) > 0 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, marginTop: spacing.md, padding: spacing.base,
          }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm }}>
              Guided checklist
            </Text>
            {session.checklist.map((item: any, index: number) => (
              <TouchableOpacity
                key={`${item.text}-${index}`}
                onPress={() => toggleChecklistItem(index)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}
              >
                <Ionicons
                  name={item.done ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={item.done ? colors.success : colors.textMuted}
                  style={{ marginRight: spacing.sm }}
                />
                <Text style={{
                  fontFamily: 'Inter_400Regular', fontSize: 13,
                  color: item.done ? colors.textMuted : colors.textPrimary,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                }}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Session notes */}
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl,
          padding: spacing.base,
        }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm }}>
            Private session notes
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Write notes for this session..."
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              minHeight: 80,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
              fontFamily: 'Inter_400Regular',
              color: colors.textPrimary,
            }}
          />
          <TouchableOpacity onPress={handleSaveNote} style={{ marginTop: spacing.sm, alignSelf: 'flex-end' }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>Save note</Text>
          </TouchableOpacity>
        </View>

        {session.status === 'completed' && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderWidth: 1, borderColor: colors.border, marginTop: spacing.md,
            padding: spacing.base,
          }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm }}>
              Post-session feedback
            </Text>
            <TextInput
              value={feedbackScore}
              onChangeText={setFeedbackScore}
              keyboardType="number-pad"
              placeholder="Score 1-5"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, color: colors.textPrimary, marginBottom: spacing.sm,
              }}
            />
            <TextInput
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="How did the session go?"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                minHeight: 60,
                backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                padding: spacing.sm, color: colors.textPrimary, marginBottom: spacing.sm,
              }}
            />
            <TextInput
              value={nextSteps}
              onChangeText={setNextSteps}
              placeholder="Next steps agreed"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                minHeight: 60,
                backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                padding: spacing.sm, color: colors.textPrimary,
              }}
            />
            <TouchableOpacity onPress={handleSubmitFeedback} style={{ marginTop: spacing.sm, alignSelf: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>Submit feedback</Text>
            </TouchableOpacity>
            <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs }}>
                How good was this match overall? (1-5)
              </Text>
              <TextInput
                value={qualityScore}
                onChangeText={setQualityScore}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
                  paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, color: colors.textPrimary, marginBottom: spacing.sm,
                }}
              />
              <TouchableOpacity onPress={handleMatchQuality}>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>Save match quality</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
