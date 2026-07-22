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
// Stable valid ObjectIds — backend stores skillId as ObjectId and rejects non-ObjectId strings
export const MOCK_SKILLS: MockSkill[] = [
  { _id: '507f1f77bcf86cd799439001', name: 'Python', slug: 'python', category: 'Programming', icon: '🐍' },
  { _id: '507f1f77bcf86cd799439002', name: 'JavaScript', slug: 'javascript', category: 'Programming', icon: '🟨' },
  { _id: '507f1f77bcf86cd799439003', name: 'React Native', slug: 'react-native', category: 'Programming', icon: '⚛️' },
  { _id: '507f1f77bcf86cd799439004', name: 'TypeScript', slug: 'typescript', category: 'Programming', icon: '🔷' },
  { _id: '507f1f77bcf86cd799439005', name: 'Node.js', slug: 'nodejs', category: 'Programming', icon: '🟢' },
  { _id: '507f1f77bcf86cd799439006', name: 'Figma', slug: 'figma', category: 'Design', icon: '🎨' },
  { _id: '507f1f77bcf86cd799439007', name: 'UI/UX Design', slug: 'ui-ux', category: 'Design', icon: '🖌️' },
  { _id: '507f1f77bcf86cd799439008', name: 'Spanish', slug: 'spanish', category: 'Languages', icon: '🇪🇸' },
  { _id: '507f1f77bcf86cd799439009', name: 'French', slug: 'french', category: 'Languages', icon: '🇫🇷' },
  { _id: '507f1f77bcf86cd79943900a', name: 'Japanese', slug: 'japanese', category: 'Languages', icon: '🇯🇵' },
  { _id: '507f1f77bcf86cd79943900b', name: 'Guitar', slug: 'guitar', category: 'Music', icon: '🎸' },
  { _id: '507f1f77bcf86cd79943900c', name: 'Piano', slug: 'piano', category: 'Music', icon: '🎹' },
  { _id: '507f1f77bcf86cd79943900d', name: 'Photography', slug: 'photography', category: 'Design', icon: '📷' },
  { _id: '507f1f77bcf86cd79943900e', name: 'Video Editing', slug: 'video-editing', category: 'Design', icon: '🎬' },
  { _id: '507f1f77bcf86cd79943900f', name: 'Excel/Sheets', slug: 'excel', category: 'Finance', icon: '📊' },
  { _id: '507f1f77bcf86cd799439010', name: 'Yoga', slug: 'yoga', category: 'Fitness', icon: '🧘' },
  { _id: '507f1f77bcf86cd799439011', name: 'Cooking', slug: 'cooking', category: 'Cooking', icon: '👨‍🍳' },
  { _id: '507f1f77bcf86cd799439012', name: 'Machine Learning', slug: 'ml', category: 'Programming', icon: '🤖' },
  { _id: '507f1f77bcf86cd799439013', name: 'Docker', slug: 'docker', category: 'Programming', icon: '🐳' },
  { _id: '507f1f77bcf86cd799439014', name: 'Drawing', slug: 'drawing', category: 'Design', icon: '✏️' },
]
