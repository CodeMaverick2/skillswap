const mongoose = require('mongoose');
const { Schema } = mongoose;

const referralSchema = new Schema(
  {
    referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },
    code: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['joined', 'active', 'rewarded'],
      default: 'joined',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
