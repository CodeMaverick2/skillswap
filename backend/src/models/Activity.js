const mongoose = require('mongoose');
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['match_sent', 'match_accepted', 'session_created', 'session_completed', 'message_sent', 'goal_milestone'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 280 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    visibility: {
      type: String,
      enum: ['private', 'connections'],
      default: 'connections',
      index: true,
    },
  },
  { timestamps: true }
);

activitySchema.index({ targetUser: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
