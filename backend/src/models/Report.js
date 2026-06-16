const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    targetType: {
      type: String,
      enum: ['user', 'message', 'session'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate', 'fake_profile', 'other'],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
