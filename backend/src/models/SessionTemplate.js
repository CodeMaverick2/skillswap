const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    skillHint: { type: String, trim: true, maxlength: 80 },
    defaultDuration: { type: Number, default: 60, min: 15, max: 180 },
    topicPrefix: { type: String, trim: true, maxlength: 100 },
    checklist: {
      type: [{
        text: { type: String, trim: true, maxlength: 140 },
      }],
      default: [],
    },
    isSystem: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SessionTemplate', sessionTemplateSchema);
