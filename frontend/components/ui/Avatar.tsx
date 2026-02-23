import { View, Text } from 'react-native'
import { getInitials } from '@/utils/avatarColor'

interface AvatarProps {
  firstName: string
  lastName: string
  color: string
  size?: number
  fontSize?: number
}

export function Avatar({
  firstName,
  lastName,
  color,
  size = 44,
  fontSize,
}: AvatarProps) {
  const initials = getInitials(firstName, lastName)
  const computedFontSize = fontSize || size * 0.38

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: computedFontSize,
          fontFamily: 'Inter_700Bold',
          color: '#FFFFFF',
          letterSpacing: 0.5,
        }}
      >
        {initials}
      </Text>
    </View>
  )
}
