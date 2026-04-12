#!/usr/bin/env node

require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Skill = require('../src/models/Skill');
const User = require('../src/models/User');
const Match = require('../src/models/Match');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const Session = require('../src/models/Session');
const Activity = require('../src/models/Activity');
const LearningGoal = require('../src/models/LearningGoal');
const Referral = require('../src/models/Referral');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
const DEFAULT_PASSWORD = 'Password@123';

const skillDefs = [
  { name: 'JavaScript', slug: 'javascript', category: 'Programming', icon: '🟨', description: 'Frontend and backend JavaScript fundamentals.' },
  { name: 'React', slug: 'react', category: 'Programming', icon: '⚛️', description: 'Building UI with React and component patterns.' },
  { name: 'Node.js', slug: 'node-js', category: 'Programming', icon: '🟩', description: 'Server-side JavaScript and API development.' },
  { name: 'Python', slug: 'python', category: 'Programming', icon: '🐍', description: 'Automation and backend scripting with Python.' },
  { name: 'UI Design', slug: 'ui-design', category: 'Design', icon: '🎨', description: 'Design systems, spacing, and interfaces.' },
  { name: 'Figma', slug: 'figma', category: 'Design', icon: '🧩', description: 'Wireframing and prototyping in Figma.' },
  { name: 'Guitar', slug: 'guitar', category: 'Music', icon: '🎸', description: 'Acoustic and electric guitar basics.' },
  { name: 'Piano', slug: 'piano', category: 'Music', icon: '🎹', description: 'Keyboard and music theory foundations.' },
  { name: 'English Speaking', slug: 'english-speaking', category: 'Languages', icon: '🗣️', description: 'Spoken English and communication skills.' },
  { name: 'Spanish', slug: 'spanish', category: 'Languages', icon: '🇪🇸', description: 'Conversational Spanish for beginners.' },
];

const usersSeed = [
  {
    email: 'qa_primary@skillswap.local',
    username: 'qa_primary',
    profile: {
      firstName: 'Tejas',
      lastName: 'QA',
      bio: 'Primary test account for checking discover, match, chat, and sessions.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#6C63FF',
    },
    teach: [
      { name: 'Python', level: 4, yearsExp: 3 },
      { name: 'Guitar', level: 3, yearsExp: 2 },
    ],
    learn: [
      { name: 'React', targetLevel: 4 },
      { name: 'Node.js', targetLevel: 4 },
      { name: 'English Speaking', targetLevel: 3 },
    ],
  },
  {
    email: 'aisha_dev@skillswap.local',
    username: 'aisha_dev',
    profile: {
      firstName: 'Aisha',
      lastName: 'Khan',
      bio: 'Full-stack engineer helping others with React and Node.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#43D9AD',
    },
    teach: [
      { name: 'React', level: 5, yearsExp: 5 },
      { name: 'Node.js', level: 4, yearsExp: 4 },
    ],
    learn: [
      { name: 'Python', targetLevel: 4 },
      { name: 'Guitar', targetLevel: 2 },
    ],
  },
  {
    email: 'rohan_music@skillswap.local',
    username: 'rohan_music',
    profile: {
      firstName: 'Rohan',
      lastName: 'Iyer',
      bio: 'Music coach looking to improve coding skills.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#FF9F43',
    },
    teach: [
      { name: 'Guitar', level: 5, yearsExp: 8 },
      { name: 'Piano', level: 4, yearsExp: 6 },
    ],
    learn: [
      { name: 'JavaScript', targetLevel: 3 },
      { name: 'React', targetLevel: 3 },
    ],
  },
  {
    email: 'meera_design@skillswap.local',
    username: 'meera_design',
    profile: {
      firstName: 'Meera',
      lastName: 'Shah',
      bio: 'Product designer who can teach Figma and UI workflows.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#FF6584',
    },
    teach: [
      { name: 'UI Design', level: 5, yearsExp: 6 },
      { name: 'Figma', level: 5, yearsExp: 5 },
    ],
    learn: [
      { name: 'Node.js', targetLevel: 3 },
      { name: 'Python', targetLevel: 3 },
    ],
  },
  {
    email: 'karan_lang@skillswap.local',
    username: 'karan_lang',
    profile: {
      firstName: 'Karan',
      lastName: 'Patel',
      bio: 'Language mentor helping with spoken English.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#54A0FF',
    },
    teach: [
      { name: 'English Speaking', level: 5, yearsExp: 7 },
      { name: 'Spanish', level: 3, yearsExp: 2 },
    ],
    learn: [
      { name: 'Python', targetLevel: 3 },
      { name: 'React', targetLevel: 3 },
    ],
  },
  {
    email: 'nina_polyglot@skillswap.local',
    username: 'nina_polyglot',
    profile: {
      firstName: 'Nina',
      lastName: 'Costa',
      bio: 'Polyglot interested in improving backend coding.',
      timezone: 'Europe/Lisbon',
      avatarColor: '#9A99BC',
    },
    teach: [
      { name: 'Spanish', level: 4, yearsExp: 5 },
      { name: 'English Speaking', level: 4, yearsExp: 4 },
    ],
    learn: [
      { name: 'Node.js', targetLevel: 4 },
      { name: 'JavaScript', targetLevel: 4 },
    ],
    lastActiveOffsetDays: 10,
  },
  {
    email: 'arjun_backend@skillswap.local',
    username: 'arjun_backend',
    profile: {
      firstName: 'Arjun',
      lastName: 'Verma',
      bio: 'Backend engineer focused on Node.js APIs and system design.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#5B8CFF',
    },
    teach: [
      { name: 'Node.js', level: 5, yearsExp: 6 },
      { name: 'JavaScript', level: 4, yearsExp: 7 },
    ],
    learn: [
      { name: 'UI Design', targetLevel: 3 },
      { name: 'English Speaking', targetLevel: 3 },
    ],
  },
  {
    email: 'kavya_ui@skillswap.local',
    username: 'kavya_ui',
    profile: {
      firstName: 'Kavya',
      lastName: 'Nair',
      bio: 'UI designer helping developers create polished interfaces.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#FF7BA9',
    },
    teach: [
      { name: 'UI Design', level: 5, yearsExp: 5 },
      { name: 'Figma', level: 5, yearsExp: 4 },
    ],
    learn: [
      { name: 'React', targetLevel: 4 },
      { name: 'Node.js', targetLevel: 3 },
    ],
  },
  {
    email: 'devansh_ai@skillswap.local',
    username: 'devansh_ai',
    profile: {
      firstName: 'Devansh',
      lastName: 'Gupta',
      bio: 'Python mentor and AI tinkerer. Loves project-based teaching.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#8D6BFF',
    },
    teach: [
      { name: 'Python', level: 5, yearsExp: 6 },
      { name: 'JavaScript', level: 3, yearsExp: 3 },
    ],
    learn: [
      { name: 'React', targetLevel: 3 },
      { name: 'English Speaking', targetLevel: 2 },
    ],
  },
  {
    email: 'ishita_speak@skillswap.local',
    username: 'ishita_speak',
    profile: {
      firstName: 'Ishita',
      lastName: 'Rao',
      bio: 'Communication trainer for confident speaking and presentation.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#4EC7A6',
    },
    teach: [
      { name: 'English Speaking', level: 5, yearsExp: 8 },
      { name: 'Spanish', level: 4, yearsExp: 3 },
    ],
    learn: [
      { name: 'Python', targetLevel: 3 },
      { name: 'Figma', targetLevel: 2 },
    ],
  },
  {
    email: 'manav_music@skillswap.local',
    username: 'manav_music',
    profile: {
      firstName: 'Manav',
      lastName: 'Kulkarni',
      bio: 'Weekend musician and guitar tutor for beginners.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#F5A524',
    },
    teach: [
      { name: 'Guitar', level: 5, yearsExp: 9 },
      { name: 'Piano', level: 3, yearsExp: 2 },
    ],
    learn: [
      { name: 'React', targetLevel: 2 },
      { name: 'JavaScript', targetLevel: 2 },
    ],
  },
  {
    email: 'priya_pm@skillswap.local',
    username: 'priya_pm',
    profile: {
      firstName: 'Priya',
      lastName: 'Deshmukh',
      bio: 'Product thinker learning to code while helping with UX clarity.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#FF6584',
    },
    teach: [
      { name: 'English Speaking', level: 4, yearsExp: 4 },
      { name: 'UI Design', level: 3, yearsExp: 2 },
    ],
    learn: [
      { name: 'Node.js', targetLevel: 3 },
      { name: 'Python', targetLevel: 3 },
    ],
  },
  {
    email: 'rahul_fullstack@skillswap.local',
    username: 'rahul_fullstack',
    profile: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      bio: 'Full-stack builder doing practical coding sessions.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#43D9AD',
    },
    teach: [
      { name: 'React', level: 4, yearsExp: 4 },
      { name: 'Node.js', level: 4, yearsExp: 4 },
    ],
    learn: [
      { name: 'Spanish', targetLevel: 2 },
      { name: 'Guitar', targetLevel: 2 },
    ],
  },
  {
    email: 'sneha_data@skillswap.local',
    username: 'sneha_data',
    profile: {
      firstName: 'Sneha',
      lastName: 'Patil',
      bio: 'Data analyst teaching Python fundamentals and logic.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#54A0FF',
    },
    teach: [
      { name: 'Python', level: 4, yearsExp: 5 },
      { name: 'English Speaking', level: 3, yearsExp: 3 },
    ],
    learn: [
      { name: 'React', targetLevel: 3 },
      { name: 'Figma', targetLevel: 2 },
    ],
  },
  {
    email: 'tanmay_design@skillswap.local',
    username: 'tanmay_design',
    profile: {
      firstName: 'Tanmay',
      lastName: 'Joshi',
      bio: 'Design systems enthusiast, loves Figma-to-frontend handoff.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#9A99BC',
    },
    teach: [
      { name: 'Figma', level: 5, yearsExp: 5 },
      { name: 'UI Design', level: 4, yearsExp: 5 },
    ],
    learn: [
      { name: 'Node.js', targetLevel: 3 },
      { name: 'JavaScript', targetLevel: 3 },
    ],
  },
  {
    email: 'neha_lang@skillswap.local',
    username: 'neha_lang',
    profile: {
      firstName: 'Neha',
      lastName: 'Bhatia',
      bio: 'Language coach focused on practical speaking confidence.',
      timezone: 'Asia/Kolkata',
      avatarColor: '#6C63FF',
    },
    teach: [
      { name: 'English Speaking', level: 5, yearsExp: 6 },
      { name: 'Spanish', level: 3, yearsExp: 2 },
    ],
    learn: [
      { name: 'React', targetLevel: 2 },
      { name: 'Python', targetLevel: 2 },
    ],
  },
];

function mapTeachSkill(skillMap, entries) {
  return entries.map((entry) => {
    const skill = skillMap.get(entry.name);
    return {
      skillId: skill._id,
      skillName: skill.name,
      skillIcon: skill.icon,
      level: entry.level,
      yearsExp: entry.yearsExp || 0,
    };
  });
}

function mapLearnSkill(skillMap, entries) {
  return entries.map((entry) => {
    const skill = skillMap.get(entry.name);
    return {
      skillId: skill._id,
      skillName: skill.name,
      skillIcon: skill.icon,
      targetLevel: entry.targetLevel,
    };
  });
}

async function upsertSkills() {
  const skillMap = new Map();

  for (const def of skillDefs) {
    const skill = await Skill.findOneAndUpdate(
      { slug: def.slug },
      { $set: def },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    skillMap.set(skill.name, skill);
  }

  return skillMap;
}

async function upsertUsers(skillMap) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const userMap = new Map();

  for (const seed of usersSeed) {
    const teachSkills = mapTeachSkill(skillMap, seed.teach);
    const learnSkills = mapLearnSkill(skillMap, seed.learn);

    const user = await User.findOneAndUpdate(
      { email: seed.email },
      {
        $set: {
          email: seed.email,
          username: seed.username,
          passwordHash,
          onboardingCompleted: true,
          profile: {
            ...seed.profile,
            lastActiveAt: new Date(Date.now() - (seed.lastActiveOffsetDays || 0) * 24 * 60 * 60 * 1000),
          },
          teachSkills,
          learnSkills,
          availability: { days: [1, 2, 3, 4, 5, 6], timeStart: 8, timeEnd: 22 },
          reputation: { avgRating: 4.6, totalSessions: 12, completionRate: 95 },
          progress: { streak: 4, bestStreak: 12, badges: ['3_day_streak', '5_sessions'] },
          referralCode: `${seed.username.slice(0, 6)}${Math.floor(1000 + Math.random() * 9000)}`,
          skippedUsers: [],
          isActive: true,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    userMap.set(seed.username, user);
  }

  return userMap;
}

async function resetRelationalData(userIds) {
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await Session.deleteMany({ participants: { $in: userIds } });
  await Match.deleteMany({ users: { $in: userIds } });
  await Activity.deleteMany({ $or: [{ actor: { $in: userIds } }, { targetUser: { $in: userIds } }] });
  await LearningGoal.deleteMany({ userId: { $in: userIds } });
  await Referral.deleteMany({ $or: [{ referrer: { $in: userIds } }, { referee: { $in: userIds } }] });
}

async function createMatch(userA, userB, initiator, status, sharedSkills) {
  return Match.create({
    users: [userA._id, userB._id],
    initiator: initiator._id,
    status,
    matchScore: sharedSkills.length * 25,
    sharedSkills,
  });
}

async function createConversationWithMessages(match, messages, initiatorId) {
  const last = messages[messages.length - 1];
  const conversation = await Conversation.create({
    participants: match.users,
    matchId: match._id,
    lastMessage: {
      text: last.text,
      senderId: last.senderId,
      createdAt: last.createdAt,
    },
    unreadCount: {
      [match.users[0].toString()]: 0,
      [match.users[1].toString()]: 1,
    },
  });

  await Message.insertMany(
    messages.map((m) => ({
      conversationId: conversation._id,
      senderId: m.senderId,
      text: m.text,
      type: m.type || 'text',
      readBy: m.readBy || [m.senderId],
      createdAt: m.createdAt,
      updatedAt: m.createdAt,
    }))
  );

  if (!messages.some((m) => m.type === 'system')) {
    await Message.create({
      conversationId: conversation._id,
      senderId: initiatorId,
      text: 'You matched! Say hello 👋',
      type: 'system',
      readBy: [],
    });
  }

  return conversation;
}

async function seedGraph(userMap) {
  const primary = userMap.get('qa_primary');
  const aisha = userMap.get('aisha_dev');
  const rohan = userMap.get('rohan_music');
  const meera = userMap.get('meera_design');
  const karan = userMap.get('karan_lang');
  const nina = userMap.get('nina_polyglot');
  const arjun = userMap.get('arjun_backend');
  const kavya = userMap.get('kavya_ui');
  const devansh = userMap.get('devansh_ai');
  const ishita = userMap.get('ishita_speak');
  const manav = userMap.get('manav_music');
  const priya = userMap.get('priya_pm');
  const rahul = userMap.get('rahul_fullstack');
  const sneha = userMap.get('sneha_data');
  const tanmay = userMap.get('tanmay_design');
  const neha = userMap.get('neha_lang');

  const acceptedOne = await createMatch(primary, aisha, primary, 'accepted', [
    { skillName: 'React', skillIcon: '⚛️', direction: 'initiator_learns' },
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_learns' },
    { skillName: 'Python', skillIcon: '🐍', direction: 'initiator_teaches' },
  ]);

  const acceptedTwo = await createMatch(primary, karan, karan, 'accepted', [
    { skillName: 'English Speaking', skillIcon: '🗣️', direction: 'initiator_teaches' },
    { skillName: 'Python', skillIcon: '🐍', direction: 'initiator_learns' },
  ]);

  await createMatch(primary, rohan, rohan, 'pending', [
    { skillName: 'Guitar', skillIcon: '🎸', direction: 'initiator_teaches' },
    { skillName: 'React', skillIcon: '⚛️', direction: 'initiator_learns' },
  ]);

  await createMatch(primary, meera, primary, 'pending', [
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_learns' },
  ]);

  await createMatch(aisha, nina, aisha, 'accepted', [
    { skillName: 'English Speaking', skillIcon: '🗣️', direction: 'initiator_learns' },
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_teaches' },
  ]);

  const acceptedThree = await createMatch(primary, arjun, arjun, 'accepted', [
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_teaches' },
    { skillName: 'UI Design', skillIcon: '🎨', direction: 'initiator_learns' },
  ]);

  const acceptedFour = await createMatch(primary, ishita, primary, 'accepted', [
    { skillName: 'English Speaking', skillIcon: '🗣️', direction: 'initiator_learns' },
    { skillName: 'Python', skillIcon: '🐍', direction: 'initiator_teaches' },
  ]);

  await createMatch(primary, kavya, primary, 'pending', [
    { skillName: 'React', skillIcon: '⚛️', direction: 'initiator_learns' },
    { skillName: 'Figma', skillIcon: '🧩', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, devansh, devansh, 'pending', [
    { skillName: 'Python', skillIcon: '🐍', direction: 'initiator_teaches' },
    { skillName: 'React', skillIcon: '⚛️', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, manav, primary, 'pending', [
    { skillName: 'Guitar', skillIcon: '🎸', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, priya, priya, 'pending', [
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, rahul, rahul, 'accepted', [
    { skillName: 'React', skillIcon: '⚛️', direction: 'initiator_teaches' },
    { skillName: 'Node.js', skillIcon: '🟩', direction: 'initiator_teaches' },
  ]);
  await createMatch(primary, sneha, sneha, 'accepted', [
    { skillName: 'Python', skillIcon: '🐍', direction: 'initiator_teaches' },
    { skillName: 'Figma', skillIcon: '🧩', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, tanmay, primary, 'pending', [
    { skillName: 'Figma', skillIcon: '🧩', direction: 'initiator_learns' },
  ]);
  await createMatch(primary, neha, neha, 'pending', [
    { skillName: 'English Speaking', skillIcon: '🗣️', direction: 'initiator_teaches' },
  ]);

  const now = Date.now();
  await createConversationWithMessages(
    acceptedOne,
    [
      {
        senderId: primary._id,
        text: 'Hey Aisha! Can we do a React architecture session this weekend?',
        createdAt: new Date(now - 1000 * 60 * 60 * 20),
      },
      {
        senderId: aisha._id,
        text: 'Sure, and I would love help improving my Python APIs.',
        createdAt: new Date(now - 1000 * 60 * 60 * 19),
      },
      {
        senderId: primary._id,
        text: 'Perfect. Let us plan one 60-minute exchange.',
        createdAt: new Date(now - 1000 * 60 * 60 * 18),
      },
    ],
    primary._id
  );

  await createConversationWithMessages(
    acceptedThree,
    [
      {
        senderId: arjun._id,
        text: 'Hey Tejas, I can do a backend API architecture walkthrough.',
        createdAt: new Date(now - 1000 * 60 * 60 * 10),
      },
      {
        senderId: primary._id,
        text: 'Perfect. I can help with UI heuristics in exchange.',
        createdAt: new Date(now - 1000 * 60 * 60 * 9),
      },
    ],
    arjun._id
  );

  await createConversationWithMessages(
    acceptedFour,
    [
      {
        senderId: primary._id,
        text: 'Hi Ishita! Need help with spoken confidence before demos.',
        createdAt: new Date(now - 1000 * 60 * 60 * 5),
      },
      {
        senderId: ishita._id,
        text: 'Absolutely, we can do role-play style sessions.',
        createdAt: new Date(now - 1000 * 60 * 60 * 4),
      },
    ],
    primary._id
  );

  await createConversationWithMessages(
    acceptedTwo,
    [
      {
        senderId: karan._id,
        text: 'Hi Tejas, I can help with spoken English fluency practice.',
        createdAt: new Date(now - 1000 * 60 * 60 * 7),
      },
      {
        senderId: primary._id,
        text: 'Great! I can teach Python basics in exchange.',
        createdAt: new Date(now - 1000 * 60 * 60 * 6),
      },
    ],
    karan._id
  );

  await Session.insertMany([
    {
      matchId: acceptedOne._id,
      participants: acceptedOne.users,
      scheduledAt: new Date(now + 1000 * 60 * 60 * 24 * 7),
      duration: 60,
      topic: 'React State Management Deep Dive',
      notes: 'Cover Zustand patterns and API caching basics.',
      status: 'confirmed',
      createdBy: primary._id,
      rating: {},
    },
    {
      matchId: acceptedTwo._id,
      participants: acceptedTwo.users,
      scheduledAt: new Date(now + 1000 * 60 * 60 * 24 * 14),
      duration: 45,
      topic: 'English Speaking Practice + Python Intro',
      notes: 'Split into two 20-minute blocks.',
      status: 'pending',
      createdBy: karan._id,
      rating: {},
    },
    {
      matchId: acceptedOne._id,
      participants: acceptedOne.users,
      scheduledAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
      duration: 60,
      topic: 'Completed: Python for Frontend Devs',
      notes: 'Covered API design and async basics.',
      status: 'completed',
      createdBy: aisha._id,
      rating: {
        [primary._id.toString()]: { score: 5, comment: 'Super useful and clear explanations.' },
        [aisha._id.toString()]: { score: 5, comment: 'Great exchange session.' },
      },
    },
    {
      matchId: acceptedThree._id,
      participants: acceptedThree.users,
      scheduledAt: new Date(now + 1000 * 60 * 60 * 24 * 4),
      duration: 60,
      topic: 'Node.js API error handling patterns',
      notes: 'Cover async flow, retries, and controller hygiene.',
      status: 'confirmed',
      createdBy: arjun._id,
      rating: {},
    },
    {
      matchId: acceptedFour._id,
      participants: acceptedFour.users,
      scheduledAt: new Date(now - 1000 * 60 * 60 * 24 * 5),
      duration: 45,
      topic: 'Completed: Demo storytelling and confidence practice',
      notes: 'Focused on intro framing and Q&A responses.',
      status: 'completed',
      createdBy: ishita._id,
      rating: {
        [primary._id.toString()]: { score: 5, comment: 'Very practical speaking tips.' },
        [ishita._id.toString()]: { score: 5, comment: 'Great participation and focus.' },
      },
    },
  ]);

  await LearningGoal.insertMany([
    {
      userId: primary._id,
      skillName: 'React',
      title: 'Ship a full-featured React screen with state management',
      progress: 45,
      status: 'active',
      milestones: [{ text: 'Build first screen', done: true }, { text: 'Add caching and retries', done: false }],
    },
    {
      userId: primary._id,
      skillName: 'English Speaking',
      title: 'Practice weekly conversation sessions',
      progress: 25,
      status: 'active',
      milestones: [{ text: 'Complete 2 practice calls', done: false }],
    },
    {
      userId: primary._id,
      skillName: 'Node.js',
      title: 'Build a production-ready API module',
      progress: 60,
      status: 'active',
      milestones: [{ text: 'Ship auth flow', done: true }, { text: 'Add smoke checks', done: true }, { text: 'Document API edge cases', done: false }],
    },
  ]);

  await Activity.insertMany([
    {
      actor: primary._id,
      targetUser: aisha._id,
      type: 'match_accepted',
      title: 'Accepted a connection request',
      description: 'You are now matched and can start chatting.',
      metadata: { matchId: acceptedOne._id },
    },
    {
      actor: primary._id,
      targetUser: karan._id,
      type: 'session_created',
      title: 'Scheduled a session',
      description: 'English Speaking Practice + Python Intro',
      metadata: { matchId: acceptedTwo._id },
    },
    {
      actor: primary._id,
      targetUser: ishita._id,
      type: 'session_completed',
      title: 'Completed a session',
      description: 'Demo storytelling and confidence practice',
      metadata: { matchId: acceptedFour._id },
    },
  ]);

  await Referral.create({
    referrer: primary._id,
    referee: nina._id,
    code: primary.referralCode,
    status: 'joined',
  });
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const skillMap = await upsertSkills();
  const userMap = await upsertUsers(skillMap);
  const userIds = Array.from(userMap.values()).map((u) => u._id);

  await resetRelationalData(userIds);
  await seedGraph(userMap);

  console.log('Seed complete.');
  console.log('Login credentials (all seeded users):');
  console.log(`Password: ${DEFAULT_PASSWORD}`);
  for (const u of usersSeed) {
    console.log(`- ${u.email} (${u.username})`);
  }
  console.log('Primary QA account: qa_primary@skillswap.local');
}

run()
  .catch((err) => {
    console.error(`Seed failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
  });
