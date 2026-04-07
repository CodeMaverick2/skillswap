const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [arr => arr.length === 2, 'A session must have exactly 2 participants'],
    },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60, min: 15, max: 180 }, // minutes
    topic: { type: String, trim: true, maxlength: 200 },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: Map,
      of: {
        score: { type: Number, min: 1, max: 5 },
        comment: { type: String, maxlength: 300 },
      },
      default: {},
    },
  },
  { timestamps: true }
);

sessionSchema.index({ participants: 1, status: 1 });
sessionSchema.index({ matchId: 1 });
sessionSchema.index({ scheduledAt: 1 });

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
