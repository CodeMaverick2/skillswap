export interface SkillLevel {
  value: number
  name: string
  icon: string
  description: string
  color: string
}

export const SKILL_LEVELS: SkillLevel[] = [
  { value: 1, name: 'Explorer', icon: '🌱', description: 'Just starting out. I know the basics and want to learn more.', color: '#9A99BC' },
  { value: 2, name: 'Learner', icon: '⚡', description: 'I understand the fundamentals and can follow along.', color: '#54A0FF' },
  { value: 3, name: 'Practitioner', icon: '🔥', description: 'I work independently and can solve real problems.', color: '#FF9F43' },
  { value: 4, name: 'Expert', icon: '💎', description: 'Deep knowledge. I guide others and go beyond the basics.', color: '#6C63FF' },
  { value: 5, name: 'Master', icon: '🏆', description: 'World-class. I innovate, lead, and have industry-level expertise.', color: '#FFD166' },
]

export const getLevelByValue = (value: number): SkillLevel =>
  SKILL_LEVELS.find(l => l.value === value) || SKILL_LEVELS[0]
