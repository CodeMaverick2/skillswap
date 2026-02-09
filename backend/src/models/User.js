const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    profile: {
      firstName: { type: String, trim: true, maxlength: 50 },
      lastName: { type: String, trim: true, maxlength: 50 },
      bio: { type: String, trim: true, maxlength: 200 },
      timezone: { type: String, default: 'Asia/Kolkata' },
      avatarColor: { type: String, default: '#6C63FF' },
      lastActiveAt: { type: Date, default: Date.now },
    },
    teachSkills: [
      {
        skillId: { type: Schema.Types.ObjectId, ref: 'Skill' },
        skillName: { type: String },
        skillIcon: { type: String },
        level: { type: Number, min: 1, max: 5 },
        yearsExp: { type: Number, default: 0 },
      },
    ],
    learnSkills: [
      {
        skillId: { type: Schema.Types.ObjectId, ref: 'Skill' },
        skillName: { type: String },
        skillIcon: { type: String },
        targetLevel: { type: Number, min: 1, max: 5 },
      },
    ],
    availability: {
      days: { type: [Number], default: [1, 2, 3, 4, 5] },
      timeStart: { type: Number, default: 9 },
      timeEnd: { type: Number, default: 21 },
    },
    reputation: {
      avgRating: { type: Number, default: 0, min: 0, max: 5 },
      totalSessions: { type: Number, default: 0 },
      completionRate: { type: Number, default: 100 },
    },
    skippedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    notificationPrefs: {
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    expoPushToken: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, obj) {
        delete obj.passwordHash;
        return obj;
      },
    },
    toObject: {
      transform(doc, obj) {
        delete obj.passwordHash;
        return obj;
      },
    },
  }
);

// Additional indexes (email and username uniqueness already enforced by unique:true above)
userSchema.index({ 'teachSkills.skillId': 1 });
userSchema.index({ 'learnSkills.skillId': 1 });
userSchema.index({ 'profile.lastActiveAt': -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
