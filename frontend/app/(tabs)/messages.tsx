import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'
import { Avatar } from '@/components/ui/Avatar'
import { getAvatarColor } from '@/utils/avatarColor'
import { useAuthStore } from '@/store/auth.store'
import api from '@/services/api'
import { formatDistanceToNow } from 'date-fns'

interface ConversationItem {
  _id: string
  participants: Array<{
    _id: string
    username: string
    profile: { firstName: string; lastName: string; avatarColor: string }
  }>
  lastMessage?: {
    text: string
    senderId: string
    createdAt: string
  }
  unread: number
}

function ConversationRow({ conversation, myId, onPress }: { conversation: ConversationItem; myId: string; onPress: () => void }) {
  const { colors } = useTheme()
  const other = conversation.participants?.find(p => p._id !== myId)
  if (!other) return null

  const name = other.profile?.firstName
    ? `${other.profile.firstName} ${other.profile.lastName || ''}`.trim()
    : other.username
  const avatarColor = other.profile?.avatarColor || getAvatarColor(other._id)
  const lastMsg = conversation.lastMessage
  const isUnread = conversation.unread > 0
  const isMine = lastMsg?.senderId === myId

  let timeAgo = ''
  if (lastMsg?.createdAt) {
    try { timeAgo = formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true }) } catch {}
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        backgroundColor: isUnread ? `${colors.primary}06` : 'transparent',
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}
      activeOpacity={0.7}
    >
      <View style={{ position: 'relative' }}>
        <Avatar firstName={other.profile?.firstName || ''} lastName={other.profile?.lastName || other.username} color={avatarColor} size={48} />
        {isUnread && (
          <View style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: 9,
            backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: colors.bg,
          }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 9, color: '#fff' }}>
              {conversation.unread > 9 ? '9+' : conversation.unread}
            </Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{
            fontFamily: isUnread ? 'Inter_700Bold' : 'Inter_600SemiBold',
            fontSize: 15, color: colors.textPrimary,
          }} numberOfLines={1}>
            {name}
          </Text>
          {timeAgo ? (
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isUnread ? colors.primary : colors.textMuted }}>
              {timeAgo}
            </Text>
          ) : null}
        </View>
        {lastMsg?.text ? (
          <Text style={{
            fontFamily: isUnread ? 'Inter_500Medium' : 'Inter_400Regular',
            fontSize: 13,
            color: isUnread ? colors.textPrimary : colors.textMuted,
            lineHeight: 19,
          }} numberOfLines={1}>
            {isMine ? 'You: ' : ''}{lastMsg.text}
          </Text>
        ) : (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, fontStyle: 'italic' }}>
            No messages yet
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
    </TouchableOpacity>
  )
}

export default function MessagesScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()

  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations')
      setConversations(res.data.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  const onRefresh = () => {
    setRefreshing(true)
    fetchConversations()
  }

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
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 26, color: colors.textPrimary, letterSpacing: -0.5 }}>Messages</Text>
        {conversations.length > 0 && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 3 }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={c => c._id}
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              myId={user?._id || ''}
              onPress={() => router.push(`/conversation/${item._id}`)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.base }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: `${colors.secondary}12`,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <Text style={{ fontSize: 40 }}>💬</Text>
          </View>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xs }}>
            No conversations yet
          </Text>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, maxWidth: 260, marginBottom: spacing.xl }}>
            Connect with someone on Discover to start chatting.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/discover')}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.primary, borderRadius: radius.lg,
              paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
            }}
          >
            <Ionicons name="compass-outline" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' }}>Find Skill Partners</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
