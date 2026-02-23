export interface SkillCategory {
  name: string
  icon: string
  color: string
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { name: 'Programming', icon: '💻', color: '#6C63FF' },
  { name: 'Design', icon: '🎨', color: '#FF6584' },
  { name: 'Languages', icon: '🌍', color: '#FFD166' },
  { name: 'Music', icon: '🎵', color: '#43D9AD' },
  { name: 'Finance', icon: '📈', color: '#54A0FF' },
  { name: 'Fitness', icon: '💪', color: '#FF9F43' },
  { name: 'Cooking', icon: '🍳', color: '#EE5A24' },
  { name: 'Other', icon: '✨', color: '#9A99BC' },
]

export interface MockSkill {
  _id: string
  name: string
  slug: string
  category: string
  icon: string
}

// Mock skills for onboarding (until backend is ready)
export const MOCK_SKILLS: MockSkill[] = [
  { _id: '1', name: 'Python', slug: 'python', category: 'Programming', icon: '🐍' },
  { _id: '2', name: 'JavaScript', slug: 'javascript', category: 'Programming', icon: '🟨' },
  { _id: '3', name: 'React Native', slug: 'react-native', category: 'Programming', icon: '⚛️' },
  { _id: '4', name: 'TypeScript', slug: 'typescript', category: 'Programming', icon: '🔷' },
  { _id: '5', name: 'Node.js', slug: 'nodejs', category: 'Programming', icon: '🟢' },
  { _id: '6', name: 'Figma', slug: 'figma', category: 'Design', icon: '🎨' },
  { _id: '7', name: 'UI/UX Design', slug: 'ui-ux', category: 'Design', icon: '🖌️' },
  { _id: '8', name: 'Spanish', slug: 'spanish', category: 'Languages', icon: '🇪🇸' },
  { _id: '9', name: 'French', slug: 'french', category: 'Languages', icon: '🇫🇷' },
  { _id: '10', name: 'Japanese', slug: 'japanese', category: 'Languages', icon: '🇯🇵' },
  { _id: '11', name: 'Guitar', slug: 'guitar', category: 'Music', icon: '🎸' },
  { _id: '12', name: 'Piano', slug: 'piano', category: 'Music', icon: '🎹' },
  { _id: '13', name: 'Photography', slug: 'photography', category: 'Design', icon: '📷' },
  { _id: '14', name: 'Video Editing', slug: 'video-editing', category: 'Design', icon: '🎬' },
  { _id: '15', name: 'Excel/Sheets', slug: 'excel', category: 'Finance', icon: '📊' },
  { _id: '16', name: 'Yoga', slug: 'yoga', category: 'Fitness', icon: '🧘' },
  { _id: '17', name: 'Cooking', slug: 'cooking', category: 'Cooking', icon: '👨‍🍳' },
  { _id: '18', name: 'Machine Learning', slug: 'ml', category: 'Programming', icon: '🤖' },
  { _id: '19', name: 'Docker', slug: 'docker', category: 'Programming', icon: '🐳' },
  { _id: '20', name: 'Drawing', slug: 'drawing', category: 'Design', icon: '✏️' },
]
