import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { useAuthStore } from '@/store/auth.store'
import api from '@/services/api'
import { io, Socket } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000'

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
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isTyping, setIsTyping] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const flatListRef = useRef<FlatList>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch messages and conversation info
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          api.get(`/messages/${id}?limit=50`),
          api.get('/messages/conversations'),
        ])
        setMessages(msgRes.data.data?.messages || [])

        const conv = (convRes.data.data || []).find((c: any) => c._id === id)
        if (conv) {
          const other = conv.participants?.find((p: any) => p._id !== user?._id)
          setOtherUser(other)
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
    })

    socket.on('connect', () => {
      socket.emit('join_conversation', id)
      socket.emit('mark_read', { conversationId: id })
    })

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
    }
  }, [id, accessToken])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setSending(true)
    setText('')

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
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.sm, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        {otherUser && (
          <Avatar firstName={otherUser.profile?.firstName || ''} lastName={otherUser.profile?.lastName || otherUser.username} color={avatarColor} size={36} />
        )}
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.textPrimary }}>{otherName}</Text>
          {isTyping && (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.primary }}>typing...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m._id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMe={item.senderId === user?._id} />
          )}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
