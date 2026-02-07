const SKILL_LEVELS = {
  1: { name: 'Explorer', icon: '🌱', description: 'Just starting out. I know the basics and want to learn more.' },
  2: { name: 'Learner', icon: '⚡', description: 'I understand the fundamentals and can follow along.' },
  3: { name: 'Practitioner', icon: '🔥', description: 'I work independently and can solve real problems.' },
  4: { name: 'Expert', icon: '💎', description: 'Deep knowledge. I guide others and go beyond the basics.' },
  5: { name: 'Master', icon: '🏆', description: 'World-class. I innovate, lead, and have industry-level expertise.' },
};

const SKILL_CATEGORIES = [
  'Programming',
  'Design',
  'Languages',
  'Music',
  'Finance',
  'Fitness',
  'Cooking',
  'Other',
];

const SESSION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const NOTIFICATION_TYPES = {
  NEW_MATCH: 'new_match',
  NEW_MESSAGE: 'new_message',
  SESSION_REQUEST: 'session_request',
  SESSION_CONFIRMED: 'session_confirmed',
  SESSION_REMINDER: 'session_reminder',
  SESSION_COMPLETED: 'session_completed',
  REVIEW_REQUEST: 'review_request',
  NEW_REVIEW: 'new_review',
};

module.exports = {
  SKILL_LEVELS,
  SKILL_CATEGORIES,
  SESSION_STATUS,
  NOTIFICATION_TYPES,
};
