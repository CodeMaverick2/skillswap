import { create } from 'zustand'

export interface TeachSkill {
  skillId: string
  skillName: string
  skillIcon: string
  level: number
  yearsExp: number
}

export interface LearnSkill {
  skillId: string
  skillName: string
  skillIcon: string
  targetLevel: number
}

export interface UserProfile {
  firstName: string
  lastName: string
  bio: string
  timezone: string
  avatarColor: string
  lastActiveAt: string
}

export interface UserReputation {
  avgRating: number
  totalSessions: number
  completionRate: number
}

export interface User {
  _id: string
  email: string
  username: string
  onboardingCompleted: boolean
  profile: UserProfile
  teachSkills: TeachSkill[]
  learnSkills: LearnSkill[]
  reputation: UserReputation
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, accessToken: string) => void
  setUser: (user: User) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setLoading: (isLoading) => set({ isLoading }),
}))
