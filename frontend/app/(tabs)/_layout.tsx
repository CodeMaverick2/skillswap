import React from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@/theme/ThemeContext'
import { spacing, radius } from '@/theme/spacing'

interface TabConfig {
  name: string
  label: string
  iconFocused: keyof typeof Ionicons.glyphMap
  iconUnfocused: keyof typeof Ionicons.glyphMap
}

const TABS: TabConfig[] = [
  { name: 'discover',  label: 'Discover',  iconFocused: 'compass',       iconUnfocused: 'compass-outline'       },
  { name: 'sessions',  label: 'Sessions',  iconFocused: 'calendar',       iconUnfocused: 'calendar-outline'       },
  { name: 'messages',  label: 'Messages',  iconFocused: 'chatbubbles',    iconUnfocused: 'chatbubbles-outline'    },
  { name: 'profile',   label: 'Profile',   iconFocused: 'person',         iconUnfocused: 'person-outline'         },
]

function TabButton({
  tab,
  isFocused,
  onPress,
  badge = 0,
}: {
  tab: TabConfig
  isFocused: boolean
  onPress: () => void
  badge?: number
}) {
  const { colors } = useTheme()
  const scale = useSharedValue(1)
  const iconY = useSharedValue(0)

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isFocused ? colors.primary + '18' : 'transparent', { duration: 180 }),
    transform: [{ scale: scale.value }],
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconY.value }],
  }))

  const handlePress = () => {
    // Bounce animation
    scale.value = withSpring(0.86, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 })
    })
    iconY.value = withSpring(-3, { damping: 8 }, () => {
      iconY.value = withSpring(0, { damping: 10 })
    })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: radius.full,
          },
          pillStyle,
        ]}
      >
        {/* Icon container with badge */}
        <View style={{ position: 'relative', marginBottom: 2 }}>
          <Animated.View style={iconStyle}>
            <Ionicons
              name={isFocused ? tab.iconFocused : tab.iconUnfocused}
              size={22}
              color={isFocused ? colors.primary : colors.textMuted}
            />
          </Animated.View>

          {badge > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -6,
                backgroundColor: colors.error,
                borderRadius: 8,
                minWidth: 16,
                height: 16,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
                borderWidth: 2,
                borderColor: colors.tabBar,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  fontSize: 9,
                  color: '#fff',
                  lineHeight: 12,
                }}
              >
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            fontFamily: isFocused ? 'Inter_600SemiBold' : 'Inter_400Regular',
            fontSize: 10,
            color: isFocused ? colors.primary : colors.textMuted,
            letterSpacing: 0.1,
          }}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

function CustomTabBar({ state, navigation }: any) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={{
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
        paddingTop: 6,
        paddingHorizontal: spacing.sm,
        // Subtle shadow upward
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 12,
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find(t => t.name === route.name)
          if (!tab) return null
          const isFocused = state.index === index

          return (
            <TabButton
              key={route.key}
              tab={tab}
              isFocused={isFocused}
              badge={0}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }}
            />
          )
        })}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  const { colors } = useTheme()

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="sessions" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}
