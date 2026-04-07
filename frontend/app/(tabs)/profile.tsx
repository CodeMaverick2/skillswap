import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/theme/ThemeContext'
import { Avatar } from '@/components/ui/Avatar'
import { spacing, radius } from '@/theme/spacing'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'
import { useAuth } from '@/hooks/useAuth'
import { getLevelByValue } from '@/constants/skillLevels'
import { getAvatarColor } from '@/utils/avatarColor'

interface SkillTagChipProps {
  icon: string
  name: string
  level: number
  isTeach?: boolean
}

function SkillTagChip({ icon, name, level, isTeach = true }: SkillTagChipProps) {
  const { colors } = useTheme()
  const levelInfo = getLevelByValue(level)
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 14, marginRight: 4 }}>{icon}</Text>
      <Text
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: 13,
          color: colors.textPrimary,
          marginRight: 6,
        }}
      >
        {name}
      </Text>
      <View
        style={{
          backgroundColor: `${levelInfo.color}30`,
          borderRadius: 10,
          paddingHorizontal: 6,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 10,
            color: levelInfo.color,
          }}
        >
          {levelInfo.icon} {levelInfo.name}
        </Text>
      </View>
    </View>
  )
}

interface StatItemProps {
  value: string
  label: string
  isMiddle?: boolean
}

function StatItem({ value, label, isMiddle = false }: StatItemProps) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderLeftWidth: isMiddle ? 1 : 0,
        borderRightWidth: isMiddle ? 1 : 0,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: 'Inter_700Bold',
          fontSize: 22,
          color: colors.textPrimary,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 12,
          color: colors.textMuted,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  )
}

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true)
            await logout()
            setLoggingOut(false)
          },
        },
      ]
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.textMuted,
            }}
          >
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const firstName = user.profile?.firstName || ''
  const lastName = user.profile?.lastName || ''
  const fullName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : user.username
  const avatarColor =
    user.profile?.avatarColor || getAvatarColor(user._id || user.username)
  const bio = user.profile?.bio || ''
  const reputation = user.reputation || {
    avgRating: 0,
    totalSessions: 0,
    completionRate: 0,
  }
  const teachSkills = user.teachSkills || []
  const learnSkills = user.learnSkills || []

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.base,
            paddingTop: spacing.base,
            marginBottom: spacing.xl,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 26,
              color: colors.textPrimary,
            }}
          >
            Profile
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textSecondary }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar & name section */}
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: spacing.base,
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              position: 'relative',
              marginBottom: spacing.md,
            }}
          >
            <Avatar
              firstName={firstName}
              lastName={lastName || user.username}
              color={avatarColor}
              size={88}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colors.success,
                borderWidth: 2.5,
                borderColor: colors.bg,
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 22,
              color: colors.textPrimary,
              marginBottom: 4,
            }}
          >
            {fullName}
          </Text>

          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: colors.primary,
              marginBottom: spacing.sm,
            }}
          >
            @{user.username}
          </Text>

          {bio ? (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
                paddingHorizontal: spacing.xl,
              }}
            >
              {bio}
            </Text>
          ) : (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textMuted,
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              No bio yet
            </Text>
          )}

          {user.profile?.timezone && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.sm,
              }}
            >
              <Ionicons
                name="globe-outline"
                size={13}
                color={colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: colors.textMuted,
                }}
              >
                {user.profile.timezone}
              </Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View
          style={{
            marginHorizontal: spacing.base,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.xl,
            overflow: 'hidden',
          }}
        >
          <StatItem
            value={String(reputation.totalSessions)}
            label="Sessions"
          />
          <StatItem
            value={
              reputation.avgRating > 0
                ? `${reputation.avgRating.toFixed(1)}★`
                : '—'
            }
            label="Avg Rating"
            isMiddle
          />
          <StatItem
            value={
              reputation.completionRate > 0
                ? `${Math.round(reputation.completionRate)}%`
                : '—'
            }
            label="Completion"
          />
        </View>

        {/* Teaches section */}
        <View
          style={{
            paddingHorizontal: spacing.base,
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: `${colors.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 14 }}>🎓</Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              I can teach
            </Text>
            <View
              style={{
                marginLeft: spacing.sm,
                backgroundColor: `${colors.primary}20`,
                borderRadius: 10,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 11,
                  color: colors.primary,
                }}
              >
                {teachSkills.length}
              </Text>
            </View>
          </View>

          {teachSkills.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {teachSkills.map((skill, i) => (
                <SkillTagChip
                  key={skill.skillId + i}
                  icon={skill.skillIcon || '📚'}
                  name={skill.skillName}
                  level={skill.level}
                  isTeach
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: colors.textMuted,
                  textAlign: 'center',
                }}
              >
                No teaching skills added yet
              </Text>
            </View>
          )}
        </View>

        {/* Wants to learn section */}
        <View
          style={{
            paddingHorizontal: spacing.base,
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: `${colors.accent}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 14 }}>🌱</Text>
            </View>
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: colors.textPrimary,
              }}
            >
              I want to learn
            </Text>
            <View
              style={{
                marginLeft: spacing.sm,
                backgroundColor: `${colors.accent}20`,
                borderRadius: 10,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 11,
                  color: colors.accent,
                }}
              >
                {learnSkills.length}
              </Text>
            </View>
          </View>

          {learnSkills.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {learnSkills.map((skill, i) => (
                <SkillTagChip
                  key={skill.skillId + i}
                  icon={skill.skillIcon || '📖'}
                  name={skill.skillName}
                  level={skill.targetLevel}
                  isTeach={false}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: colors.textMuted,
                  textAlign: 'center',
                }}
              >
                No learning goals added yet
              </Text>
            </View>
          )}
        </View>

        {/* Account info card */}
        <View
          style={{
            marginHorizontal: spacing.base,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.xl,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Account
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: colors.textMuted,
                  marginBottom: 2,
                }}
              >
                Email
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              >
                {user.email}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Ionicons
              name="at-outline"
              size={18}
              color={colors.textMuted}
              style={{ marginRight: spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: colors.textMuted,
                  marginBottom: 2,
                }}
              >
                Username
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              >
                @{user.username}
              </Text>
            </View>
          </View>

          {/* Dark mode toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.md,
            }}
          >
            <Ionicons
              name={isDark ? 'moon' : 'sunny-outline'}
              size={18}
              color={colors.textMuted}
              style={{ marginRight: spacing.md }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.textPrimary }}>
                Dark Mode
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                {isDark ? 'On' : 'Off'} · follows system by default
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: spacing.base }}>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={loggingOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${colors.error}12`,
              borderRadius: radius.md,
              paddingVertical: spacing.md + 2,
              borderWidth: 1,
              borderColor: `${colors.error}30`,
              opacity: loggingOut ? 0.6 : 1,
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.error}
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 15,
                color: colors.error,
              }}
            >
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
