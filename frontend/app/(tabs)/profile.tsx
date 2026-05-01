import React, { useEffect, useState } from 'react'
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
import api from '@/services/api'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface SkillTagChipProps {
  icon: string
  name: string
  level: number
}

function SkillTagChip({ icon, name, level }: SkillTagChipProps) {
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
  const [feed, setFeed] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const [feedRes, goalsRes, referralRes] = await Promise.all([
          api.get('/activity/feed?limit=8'),
          api.get('/goals'),
          api.get('/referrals/me'),
        ])
        setFeed(feedRes.data.data || [])
        setGoals(goalsRes.data.data || [])
        setReferrals(referralRes.data.data?.referrals || [])
      } catch {
        setFeed([])
        setGoals([])
        setReferrals([])
      }
    }
    loadFeed()
  }, [])

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
        <Animated.View
          entering={FadeInDown.duration(260)}
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
        </Animated.View>
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
  const streak = user.progress?.streak || 0
  const bestStreak = user.progress?.bestStreak || 0
  const badges = user.progress?.badges || []
  const createGoalFromSkill = async (skill: any) => {
    try {
      const res = await api.post('/goals', {
        skillId: skill.skillId,
        skillName: skill.skillName,
        title: `Reach level ${skill.targetLevel} in ${skill.skillName}`,
        milestones: [
          { text: 'Complete first practice session', done: false },
          { text: 'Finish 3 focused sessions', done: false },
        ],
      })
      setGoals((prev) => [res.data.data, ...prev])
    } catch {
      // no-op
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] }}
      >
        {/* Header row */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(260)}
          style={{
            paddingHorizontal: spacing.base,
            paddingTop: spacing.base,
            marginBottom: spacing.xl,
          }}
        >
          <View style={{
            backgroundColor: colors.info,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.base,
            borderWidth: 1,
            borderColor: `${colors.info}AA`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 26, color: '#fff' }}>
                  Profile
                </Text>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#E9F5FF', marginTop: 2 }}>
                  Growth, goals, and social proof
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/edit-profile')}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radius.full,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#fff' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/onboarding/step2-teach?mode=edit')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${colors.primary}12`,
              borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
              borderWidth: 1,
              borderColor: `${colors.primary}30`,
            }}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary }}>
              Update Skills
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar & name section */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(260)}
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
        </Animated.View>

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(260)}
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
        </Animated.View>

        {/* Progress row */}
        <View
          style={{
            marginHorizontal: spacing.base,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.xl,
            overflow: 'hidden',
            padding: spacing.base,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm }}>
            Progress
          </Text>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
            Current streak: {streak} days · Best streak: {bestStreak} days
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
            {badges.length > 0 ? badges.map((badge) => (
              <View key={badge} style={{ backgroundColor: `${colors.primary}12`, borderRadius: radius.full, borderWidth: 1, borderColor: `${colors.primary}30`, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginRight: spacing.xs, marginBottom: spacing.xs }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.primary }}>{badge.replace(/_/g, ' ')}</Text>
              </View>
            )) : (
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textMuted }}>No badges yet. Keep learning.</Text>
            )}
          </View>
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

        {/* Activity feed */}
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
          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Recent Activity
            </Text>
          </View>
          {feed.length > 0 ? (
            feed.map((item) => (
              <View key={item._id} style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row' }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center',
                  marginRight: spacing.sm, marginTop: 2,
                }}>
                  <Ionicons name="flash-outline" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                    {item.title}
                  </Text>
                  {!!item.description && (
                    <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted }}>
                Activity will appear here after matches, sessions, and messages.
              </Text>
            </View>
          )}
        </View>

        {/* Learning goals */}
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
          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Learning Goals
            </Text>
          </View>
          {goals.length > 0 ? goals.slice(0, 4).map((goal) => (
            <View key={goal._id} style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textPrimary }}>
                {goal.title}
              </Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                {goal.skillName} · {goal.progress || 0}% · {goal.status}
              </Text>
            </View>
          )) : (
            <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm }}>
                No goals yet. Create one from your learning skills:
              </Text>
              {learnSkills.slice(0, 2).map((skill) => (
                <TouchableOpacity
                  key={skill.skillId}
                  onPress={() => createGoalFromSkill(skill)}
                  style={{
                    backgroundColor: `${colors.accent}12`,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: `${colors.accent}30`,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs + 2,
                    marginBottom: spacing.xs,
                  }}
                >
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.accent }}>
                    Create goal for {skill.skillName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Referrals */}
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
          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Referrals
            </Text>
          </View>
          <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.md }}>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.textPrimary }}>
              Code: {user.referralCode || 'Generating...'}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              Joined through you: {referrals.length}
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: spacing.base }}>
          <TouchableOpacity
            activeOpacity={0.85}
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
