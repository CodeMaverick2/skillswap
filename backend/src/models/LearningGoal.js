const mongoose = require('mongoose');
const { Schema } = mongoose;

const learningGoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill' },
    skillName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    targetDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    milestones: {
      type: [{
        text: { type: String, trim: true, maxlength: 140 },
        done: { type: Boolean, default: false },
      }],
      default: [],
    },
    weeklyTargetSessions: { type: Number, min: 0, max: 14, default: 1 },
    weeklyCompletedSessions: { type: Number, min: 0, max: 14, default: 0 },
    weekStartsAt: { type: Date },
    pathSteps: {
      type: [{
        title: { type: String, trim: true, maxlength: 140 },
        done: { type: Boolean, default: false },
        weekIndex: { type: Number, min: 1, max: 52 },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

learningGoalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('LearningGoal', learningGoalSchema);
