import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/ui/Button'
import { spacing, radius } from '@/theme/spacing'
import { MOCK_SKILLS, SKILL_CATEGORIES, MockSkill } from '@/constants/skillCategories'
import { SKILL_LEVELS, getLevelByValue } from '@/constants/skillLevels'
import api from '@/services/api'
import { useAuthStore } from '@/store/auth.store'

interface SelectedTeachSkill {
  skill: MockSkill
  level: number
}

function StepProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  const { colors } = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing['2xl'],
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: i < current ? colors.primary : 'transparent',
              borderWidth: 2,
              borderColor: i < current ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i < current - 1 ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : i === current - 1 ? (
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 14,
                  color: 'white',
                }}
              >
                {i + 1}
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: colors.textMuted,
                }}
              >
                {i + 1}
              </Text>
            )}
          </View>
          {i < total - 1 && (
            <View
              style={{
                flex: 1,
                height: 2,
                backgroundColor:
                  i < current - 1 ? colors.primary : colors.border,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

export default function Step2TeachScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedSkills, setSelectedSkills] = useState<SelectedTeachSkill[]>([])
  const [pendingSkill, setPendingSkill] = useState<MockSkill | null>(null)
  const [pendingLevel, setPendingLevel] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const bottomSheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['55%', '75%'], [])

  const openLevelSelector = useCallback((skill: MockSkill) => {
    setPendingSkill(skill)
    setPendingLevel(3)
    bottomSheetRef.current?.expand()
  }, [])

  const closeLevelSelector = useCallback(() => {
    bottomSheetRef.current?.close()
    setPendingSkill(null)
  }, [])

  const addSkillWithLevel = useCallback(() => {
    if (!pendingSkill) return
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.skill._id === pendingSkill._id)
      if (exists) {
        return prev.map((s) =>
          s.skill._id === pendingSkill._id ? { ...s, level: pendingLevel } : s
        )
      }
      return [...prev, { skill: pendingSkill, level: pendingLevel }]
    })
    closeLevelSelector()
  }, [pendingSkill, pendingLevel, closeLevelSelector])

  const removeSkill = useCallback((skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.skill._id !== skillId))
  }, [])

  const handleSkillCardPress = useCallback(
    (skill: MockSkill) => {
      const isSelected = selectedSkills.some((s) => s.skill._id === skill._id)
      if (isSelected) {
        removeSkill(skill._id)
      } else {
        openLevelSelector(skill)
      }
    },
    [selectedSkills, removeSkill, openLevelSelector]
  )

  const filteredSkills = useMemo(() => {
    return MOCK_SKILLS.filter((skill) => {
      const matchesCategory =
        selectedCategory === 'All' || skill.category === selectedCategory
      const matchesSearch =
        searchQuery === '' ||
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  )

  const handleNext = async () => {
    if (selectedSkills.length === 0) return
    setLoading(true)
    try {
      const teachSkills = selectedSkills.map((s) => ({
        skillId: s.skill._id,
        skillName: s.skill.name,
        skillIcon: s.skill.icon,
        level: s.level,
        yearsExp: 0,
      }))
      const response = await api.put('/users/me/skills', {
        teachSkills,
        learnSkills: user?.learnSkills || [],
      })
      setUser(response.data.data)
      router.push('/(auth)/onboarding/step3-learn')
    } catch (error: unknown) {
      // Even if API fails, proceed to next step (skills saved locally)
      router.push('/(auth)/onboarding/step3-learn')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['All', ...SKILL_CATEGORIES.map((c) => c.name)]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingTop: spacing.xl,
            paddingBottom: 160,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step progress */}
          <StepProgress current={2} total={3} />

          {/* Title */}
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 26,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              letterSpacing: -0.3,
            }}
          >
            What can you teach?
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: colors.textMuted,
              marginBottom: spacing.xl,
              lineHeight: 22,
            }}
          >
            Pick skills and your proficiency level
          </Text>

          {/* Search bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: searchFocused ? colors.primary : colors.border,
              paddingHorizontal: spacing.md,
              minHeight: 48,
              marginBottom: spacing.md,
            }}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? colors.primary : colors.textMuted}
              style={{ marginRight: spacing.sm }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search skills..."
              placeholderTextColor={colors.textMuted}
              style={{
                flex: 1,
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: colors.textPrimary,
                paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
              }}
              selectionColor={colors.primary}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.md, gap: spacing.sm }}
            style={{ marginBottom: spacing.base }}
          >
            {categories.map((cat) => {
              const catInfo = SKILL_CATEGORIES.find((c) => c.name === cat)
              const isSelected = selectedCategory === cat
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSelected ? colors.primary : colors.surfaceAlt,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  {catInfo && (
                    <Text style={{ fontSize: 13, marginRight: 4 }}>
                      {catInfo.icon}
                    </Text>
                  )}
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Skill grid — 2 columns */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {filteredSkills.map((skill) => {
              const selectedEntry = selectedSkills.find(
                (s) => s.skill._id === skill._id
              )
              const isSelected = !!selectedEntry
              const levelInfo = selectedEntry
                ? getLevelByValue(selectedEntry.level)
                : null

              return (
                <TouchableOpacity
                  key={skill._id}
                  onPress={() => handleSkillCardPress(skill)}
                  style={{
                    width: '47.5%',
                    backgroundColor: isSelected
                      ? `${colors.primary}18`
                      : colors.surface,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    position: 'relative',
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: spacing.xs }}>
                    {skill.icon}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      fontSize: 14,
                      color: colors.textPrimary,
                      marginBottom: spacing.xs,
                    }}
                    numberOfLines={1}
                  >
                    {skill.name}
                  </Text>
                  {isSelected && levelInfo ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: `${levelInfo.color}20`,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 2,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ fontSize: 10, marginRight: 3 }}>
                        {levelInfo.icon}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 10,
                          color: levelInfo.color,
                        }}
                      >
                        {levelInfo.name}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        fontSize: 11,
                        color: colors.textMuted,
                      }}
                    >
                      Tap to add
                    </Text>
                  )}

                  {isSelected && (
                    <View
                      style={{
                        position: 'absolute',
                        top: spacing.sm,
                        right: spacing.sm,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="checkmark" size={12} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {filteredSkills.length === 0 && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: spacing['2xl'],
              }}
            >
              <Text style={{ fontSize: 36, marginBottom: spacing.md }}>🔍</Text>
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 15,
                  color: colors.textMuted,
                  textAlign: 'center',
                }}
              >
                No skills found for "{searchQuery}"
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom bar with selected skills + Next button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: spacing.base,
            paddingTop: spacing.md,
            paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] : spacing.base,
          }}
        >
          {selectedSkills.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
            >
              {selectedSkills.map((entry) => (
                <TouchableOpacity
                  key={entry.skill._id}
                  onPress={() => removeSkill(entry.skill._id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: `${colors.primary}18`,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs + 2,
                    borderWidth: 1,
                    borderColor: `${colors.primary}40`,
                  }}
                >
                  <Text style={{ fontSize: 13, marginRight: 4 }}>
                    {entry.skill.icon}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: 13,
                      color: colors.primary,
                      marginRight: 4,
                    }}
                  >
                    {entry.skill.name}
                  </Text>
                  <Ionicons name="close" size={12} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Button
            title={
              selectedSkills.length === 0
                ? 'Select at least one skill'
                : `Next → (${selectedSkills.length} selected)`
            }
            onPress={handleNext}
            loading={loading}
            disabled={selectedSkills.length === 0 || loading}
            fullWidth
            size="lg"
          />
        </View>
      </View>

      {/* Level Selector Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onClose={() => setPendingSkill(null)}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.base,
            paddingBottom: spacing['2xl'],
          }}
        >
          {pendingSkill && (
            <>
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing.xl,
                  paddingTop: spacing.sm,
                }}
              >
                <Text style={{ fontSize: 28, marginRight: spacing.sm }}>
                  {pendingSkill.icon}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'Inter_700Bold',
                      fontSize: 18,
                      color: colors.textPrimary,
                    }}
                  >
                    Your level in {pendingSkill.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 13,
                      color: colors.textMuted,
                    }}
                  >
                    Select your proficiency level
                  </Text>
                </View>
              </View>

              {/* Level cards */}
              {SKILL_LEVELS.map((level) => {
                const isSelected = pendingLevel === level.value
                return (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => setPendingLevel(level.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? `${level.color}15`
                        : colors.surfaceAlt,
                      borderRadius: radius.lg,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                      borderWidth: 1.5,
                      borderColor: isSelected ? level.color : colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: `${level.color}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{level.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 15,
                          color: isSelected ? level.color : colors.textPrimary,
                          marginBottom: 2,
                        }}
                      >
                        {level.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 12,
                          color: colors.textSecondary,
                          lineHeight: 18,
                        }}
                      >
                        {level.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: level.color,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: spacing.sm,
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}

              {/* Add button */}
              <Button
                title={`Add ${pendingSkill.name}`}
                onPress={addSkillWithLevel}
                fullWidth
                size="lg"
                style={{ marginTop: spacing.md }}
              />
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  )
}
