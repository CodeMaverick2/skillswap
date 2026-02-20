import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import { lightColors, darkColors, AppColors } from './colors'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  colors: AppColors
  isDark: boolean
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  mode: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    setMode(systemScheme === 'dark' ? 'dark' : 'light')
  }, [systemScheme])

  const toggleTheme = () => setMode(prev => prev === 'dark' ? 'light' : 'dark')
  const isDark = mode === 'dark'
  const colors = isDark ? darkColors : lightColors

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
