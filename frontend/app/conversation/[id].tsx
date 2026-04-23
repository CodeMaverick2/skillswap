import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { useAuthStore } from '@/store/auth.store'
import api, { SOCKET_URL } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { getApiError } from '@/utils/apiError'
import { io, Socket } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface ChatMessage {
  _id: string
  conversationId: string
  senderId: string
  text: string
  type: string
  createdAt: string
  readBy: string[]
}

function MessageBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  const { colors } = useTheme()
  const isSystem = message.type === 'system'

  if (isSystem) {
    return (
      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        <Text style={{
          fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted,
          backgroundColor: colors.surfaceAlt, borderRadius: radius.full,
          paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
        }}>
          {message.text}
        </Text>
      </View>
    )
  }

  let timeAgo = ''
  try { timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) } catch {}

  return (
    <View style={{
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.base,
    }}>
      <View style={{
        backgroundColor: isMe ? colors.primary : colors.surface,
        borderRadius: 18,
        borderBottomRightRadius: isMe ? 4 : 18,
        borderBottomLeftRadius: isMe ? 18 : 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        maxWidth: '78%',
        borderWidth: isMe ? 0 : 1,
        borderColor: colors.border,
      }}>
        <Text style={{
          fontFamily: 'Inter_400Regular', fontSize: 15,
          color: isMe ? '#fff' : colors.textPrimary,
          lineHeight: 21,
        }}>
          {message.text}
        </Text>
      </View>
      <Text style={{
        fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted,
        marginTop: 3, marginHorizontal: spacing.xs,
      }}>
        {timeAgo}
      </Text>
      {isMe && !isSystem && (
        <Text style={{
          fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.textMuted,
          marginTop: 1, marginHorizontal: spacing.xs,
        }}>
          {message.readBy?.length > 1 ? 'Read' : 'Sent'}
        </Text>
      )}
    </View>
  )
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [socketConnected, setSocketConnected] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [sessionTopic, setSessionTopic] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const [sessionDuration, setSessionDuration] = useState('60')
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/new')
  const [scheduling, setScheduling] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([])
  const introPrompts = [
    'Hi! Excited to connect - what do you want to learn first?',
    'Want to schedule a quick 30-minute intro session this week?',
    'I can start with a beginner-friendly walkthrough. Interested?',
  ]
  const toast = useToast()
  const goBackSafe = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/messages')
  }

  const socketRef = useRef<Socket | null>(null)
  const flatListRef = useRef<FlatList>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch messages and conversation info
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          api.get(`/messages/${id}?limit=30&page=1`),
          api.get('/messages/conversations'),
        ])
        setMessages(msgRes.data.data?.messages || [])
        setPage(msgRes.data.data?.page || 1)
        setTotalPages(msgRes.data.data?.totalPages || 1)

        const conv = (convRes.data.data || []).find((c: any) => c._id === id)
        if (conv) {
          const other = conv.participants?.find((p: any) => p._id !== user?._id)
          setOtherUser(other)
          if (conv.matchId) setMatchId(typeof conv.matchId === 'string' ? conv.matchId : conv.matchId._id)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [id])

  // Socket connection
  useEffect(() => {
    if (!accessToken || !id) return

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join_conversation', id)
      socket.emit('mark_read', { conversationId: id })
    })
    socket.on('disconnect', () => setSocketConnected(false))

    socket.on('new_message', (msg: ChatMessage) => {
      if (msg.conversationId === id) {
        setMessages(prev => [...prev, msg])
        socket.emit('mark_read', { conversationId: id })
      }
    })

    socket.on('user_typing', ({ userId }: { userId: string }) => {
      if (userId !== user?._id) setIsTyping(true)
    })

    socket.on('user_stop_typing', ({ userId }: { userId: string }) => {
      if (userId !== user?._id) setIsTyping(false)
    })

    socketRef.current = socket

    return () => {
      socket.emit('leave_conversation', id)
      socket.disconnect()
      setSocketConnected(false)
      socketRef.current = null
    }
  }, [id, accessToken])

  // Disconnect socket if user logs out (accessToken becomes null)
  useEffect(() => {
    if (!accessToken && socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [accessToken])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    setText('')
    Keyboard.dismiss()

    // Optimistic add
    const tempMsg: ChatMessage = {
      _id: `temp-${Date.now()}`,
      conversationId: id!,
      senderId: user?._id || '',
      text: trimmed,
      type: 'text',
      createdAt: new Date().toISOString(),
      readBy: [user?._id || ''],
    }
    setMessages(prev => [...prev, tempMsg])

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { conversationId: id, text: trimmed }, (res: any) => {
        if (res?.success && res.message) {
          setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.message : m))
        }
      })
    } else {
      try {
        const res = await api.post(`/messages/${id}`, { text: trimmed })
        setMessages(prev => prev.map(m => m._id === tempMsg._id ? res.data.data : m))
      } catch {
        // Remove temp message on failure
        setMessages(prev => prev.filter(m => m._id !== tempMsg._id))
        setText(trimmed)
        toast.error('Failed to send message')
      }
    }

    setSending(false)
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop_typing', { conversationId: id })
    }
  }, [text, sending, id, user])

  const handleTyping = (value: string) => {
    setText(value)
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { conversationId: id })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('stop_typing', { conversationId: id })
      }, 2000)
    }
  }

  const handleScheduleSession = async () => {
    if (!sessionTopic.trim()) { toast.error('Topic is required'); return }
    if (!sessionDate.trim()) { toast.error('Date is required (YYYY-MM-DD HH:mm)'); return }
    if (!matchId) { toast.error('Match not found'); return }

    const parsedDate = new Date(sessionDate.trim())
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
      toast.error('Enter a valid future date (YYYY-MM-DD HH:mm)')
      return
    }

    setScheduling(true)
    try {
      await api.post('/sessions', {
        matchId,
        scheduledAt: parsedDate.toISOString(),
        duration: parseInt(sessionDuration) || 60,
        topic: sessionTopic.trim(),
        meetingLink: meetingLink.trim() || 'https://meet.google.com/new',
      })
      toast.success('Session scheduled!')
      setShowSchedule(false)
      setSessionTopic('')
      setSessionDate('')
      setSessionDuration('60')
      setMeetingLink('https://meet.google.com/new')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setScheduling(false)
    }
  }

  const fetchSlots = async () => {
    if (!matchId) return
    try {
      const from = new Date().toISOString()
      const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
      const res = await api.get(`/sessions/slots?matchId=${matchId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      const slots: string[] = res.data.data || []
      setSuggestedSlots(slots.slice(0, 4))
    } catch {
      toast.error('Unable to fetch suggested slots')
    }
  }

  const sendIntroPrompt = (prompt: string) => {
    setText(prompt)
  }

  const loadOlderMessages = async () => {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await api.get(`/messages/${id}?limit=30&page=${nextPage}`)
      const older = res.data.data?.messages || []
      setMessages((prev) => [...older, ...prev])
      setPage(nextPage)
    } catch {
      toast.error('Failed to load older messages')
    } finally {
      setLoadingMore(false)
    }
  }

  const otherName = otherUser?.profile?.firstName
    ? `${otherUser.profile.firstName} ${otherUser.profile.lastName || ''}`.trim()
    : otherUser?.username || 'Chat'

  const avatarColor = otherUser?.profile?.avatarColor || getAvatarColor(otherUser?._id || '')

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.base, paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.surface,
      }}>
        <TouchableOpacity activeOpacity={0.75} onPress={goBackSafe} style={{ marginRight: spacing.sm, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        {otherUser && (
          <Avatar firstName={otherUser.profile?.firstName || ''} lastName={otherUser.profile?.lastName || otherUser.username} color={avatarColor} size={36} />
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary }}>{otherName}</Text>
          {isTyping ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.primary }}>typing...</Text>
          ) : (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: socketConnected ? colors.success : colors.warning }}>
              {socketConnected ? 'online' : 'reconnecting...'}
            </Text>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowSchedule(!showSchedule)}
          style={{ padding: 6, backgroundColor: showSchedule ? `${colors.primary}15` : 'transparent', borderRadius: radius.sm }}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Schedule Session Form */}
      {showSchedule && (
        <Animated.View entering={FadeInDown.duration(220)} style={{
          borderBottomWidth: 1, borderBottomColor: colors.border,
          backgroundColor: colors.surface, padding: spacing.base,
        }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: spacing.sm }}>
            📅 Schedule a Session
          </Text>
          <TextInput
            value={sessionTopic}
            onChangeText={setSessionTopic}
            placeholder="Topic (e.g. Python basics)"
            placeholderTextColor={colors.textMuted}
            style={{
              fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textPrimary,
              backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
              borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
            }}
            selectionColor={colors.primary}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <TextInput
              value={sessionDate}
              onChangeText={setSessionDate}
              placeholder="2025-01-15 14:00"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 2, fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textPrimary,
                backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                borderWidth: 1, borderColor: colors.border,
              }}
              selectionColor={colors.primary}
            />
            <TextInput
              value={sessionDuration}
              onChangeText={setSessionDuration}
              placeholder="60"
              keyboardType="number-pad"
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textPrimary,
                backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
                paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                borderWidth: 1, borderColor: colors.border, textAlign: 'center',
              }}
              selectionColor={colors.primary}
            />
          </View>
          <TextInput
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="Meeting link (default: Google Meet)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textPrimary,
              backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
              paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
              borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
            }}
            selectionColor={colors.primary}
          />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: spacing.sm }}>
            Date format: YYYY-MM-DD HH:mm · Duration in minutes
          </Text>
          <TouchableOpacity
            onPress={handleScheduleSession}
            disabled={scheduling}
            style={{
              backgroundColor: colors.primary, borderRadius: radius.sm,
              paddingVertical: spacing.sm, alignItems: 'center',
              opacity: scheduling ? 0.7 : 1,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' }}>
              {scheduling ? 'Scheduling...' : 'Schedule Session'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={fetchSlots}
            style={{
              marginTop: spacing.sm,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.xs + 2,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary }}>
              Suggest available slots
            </Text>
          </TouchableOpacity>
          {suggestedSlots.length > 0 && (
            <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
              {suggestedSlots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSessionDate(slot.slice(0, 16).replace('T', ' '))}
                  style={{
                    backgroundColor: `${colors.primary}12`,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: `${colors.primary}30`,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary }}>
                    {new Date(slot).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {messages.length <= 1 && (
        <View style={{
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs }}>
            Smart intro prompts
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {introPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.85}
                onPress={() => sendIntroPrompt(prompt)}
                style={{
                  backgroundColor: `${colors.primary}14`,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: `${colors.primary}30`,
                  paddingHorizontal: spacing.md + 2,
                  paddingVertical: spacing.xs + 2,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary }}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m._id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMe={item.senderId === user?._id} />
          )}
          contentContainerStyle={messages.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingVertical: spacing.md }}
          onContentSizeChange={() => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false }) }}
          onLayout={() => { if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: false }) }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: `${colors.primary}12`,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: spacing.md,
              }}>
                <Text style={{ fontSize: 30 }}>👋</Text>
              </View>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>
                Say hello to start the conversation!
              </Text>
            </View>
          }
          ListHeaderComponent={
            page < totalPages ? (
              <TouchableOpacity
                onPress={loadOlderMessages}
                disabled={loadingMore}
                style={{
                  alignSelf: 'center',
                  marginBottom: spacing.md,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.textSecondary }}>
                  {loadingMore ? 'Loading older...' : 'Load older messages'}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />

        {/* Input */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
          borderTopWidth: 1, borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
        }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'flex-end',
            backgroundColor: colors.surfaceAlt, borderRadius: 22,
            paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? spacing.sm : 4,
            marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border,
            minHeight: 44, maxHeight: 120,
          }}>
            <TextInput
              value={text}
              onChangeText={handleTyping}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15,
                color: colors.textPrimary, maxHeight: 100,
                paddingVertical: Platform.OS === 'ios' ? 4 : 6,
              }}
              selectionColor={colors.primary}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: text.trim() ? colors.primary : colors.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
