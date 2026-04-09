const express = require('express');
const Joi = require('joi');
const LearningGoal = require('../models/LearningGoal');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');

const router = express.Router();

const goalSchema = Joi.object({
  skillId: Joi.string().optional(),
  skillName: Joi.string().trim().required(),
  title: Joi.string().trim().max(140).required(),
  targetDate: Joi.date().iso().optional(),
  milestones: Joi.array().items(Joi.object({ text: Joi.string().trim().max(140).required(), done: Joi.boolean().optional() })).max(10).optional(),
});

router.get('/', protect, async (req, res) => {
  const goals = await LearningGoal.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json(successResponse(goals, 'Goals fetched'));
});

router.post('/', protect, async (req, res) => {
  const { error, value } = goalSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  const goal = await LearningGoal.create({ ...value, userId: req.user._id });
  res.status(201).json(successResponse(goal, 'Goal created'));
});

router.put('/:id', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json(errorResponse('Invalid goal ID'));
  const updates = {};
  ['title', 'targetDate', 'status', 'progress', 'milestones', 'skillName'].forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const goal = await LearningGoal.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: updates }, { new: true });
  if (!goal) return res.status(404).json(errorResponse('Goal not found'));
  res.json(successResponse(goal, 'Goal updated'));
});

router.delete('/:id', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json(errorResponse('Invalid goal ID'));
  const goal = await LearningGoal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!goal) return res.status(404).json(errorResponse('Goal not found'));
  res.json(successResponse(null, 'Goal deleted'));
});

module.exports = router;
