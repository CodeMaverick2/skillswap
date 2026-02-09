const mongoose = require('mongoose');
const { SKILL_CATEGORIES } = require('../config/constants');

const { Schema } = mongoose;

const skillSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: SKILL_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    icon: {
      type: String,
      required: [true, 'Icon is required'],
    },
    description: {
      type: String,
    },
    tags: {
      type: [String],
    },
    totalUsers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
