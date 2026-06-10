const mongoose = require('mongoose');
const { Schema } = mongoose;

const analyticsEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: {
      type: String,
      required: true,
      index: true,
      enum: [
        'register_success',
        'onboarding_completed',
        'match_request_sent',
        'match_request_accepted',
        'first_message_sent',
        'session_created',
        'session_completed',
        'match_quality_feedback',
      ],
    },
    properties: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ name: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
