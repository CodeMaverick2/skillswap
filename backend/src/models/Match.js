const mongoose = require('mongoose');
const { Schema } = mongoose;

const matchSchema = new Schema(
  {
    users: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [arr => arr.length === 2, 'A match must have exactly 2 users'],
    },
    // Who initiated
    initiator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    matchScore: { type: Number, default: 0 },
    // Skills the initiator wants to learn from the other
    sharedSkills: [
      {
        skillName: String,
        skillIcon: String,
        direction: { type: String, enum: ['initiator_teaches', 'initiator_learns'] },
      },
    ],
  },
  { timestamps: true }
);

matchSchema.index({ users: 1 });
matchSchema.index({ initiator: 1, status: 1 });
matchSchema.index({ status: 1, createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
