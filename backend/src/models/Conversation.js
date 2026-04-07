const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: [arr => arr.length === 2, 'A conversation must have exactly 2 participants'],
    },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    lastMessage: {
      text: String,
      senderId: Schema.Types.ObjectId,
      createdAt: Date,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ matchId: 1 }, { unique: true });
conversationSchema.index({ 'lastMessage.createdAt': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
