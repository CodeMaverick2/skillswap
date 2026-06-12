const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchOutcomeSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    peerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    repliedToFirstMessage: { type: Boolean, default: false },
    sessionScheduled: { type: Boolean, default: false },
    sessionCompleted: { type: Boolean, default: false },
    qualityScore: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

matchOutcomeSchema.index({ peerId: 1 });
matchOutcomeSchema.index({ userId: 1, peerId: 1 });

module.exports = mongoose.model('MatchOutcome', matchOutcomeSchema);
