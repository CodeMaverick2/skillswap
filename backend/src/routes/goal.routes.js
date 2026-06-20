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
  weeklyTargetSessions: Joi.number().integer().min(0).max(14).optional(),
  pathSteps: Joi.array().items(Joi.object({
    title: Joi.string().trim().max(140).required(),
    done: Joi.boolean().optional(),
    weekIndex: Joi.number().integer().min(1).max(52).optional(),
  })).max(20).optional(),
});

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);
  return date;
}

function maybeResetWeekly(goal) {
  const weekStart = startOfWeek();
  if (!goal.weekStartsAt || new Date(goal.weekStartsAt) < weekStart) {
    goal.weekStartsAt = weekStart;
    goal.weeklyCompletedSessions = 0;
  }
  return goal;
}

router.get('/', protect, async (req, res) => {
  const goals = await LearningGoal.find({ userId: req.user._id }).sort({ createdAt: -1 });
  for (const g of goals) {
    maybeResetWeekly(g);
    if (g.isModified()) await g.save();
  }
  res.json(successResponse(goals.map((g) => g.toObject()), 'Goals fetched'));
});

router.post('/', protect, async (req, res) => {
  const { error, value } = goalSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  const goal = await LearningGoal.create({
    ...value,
    userId: req.user._id,
    weekStartsAt: startOfWeek(),
    weeklyCompletedSessions: 0,
    weeklyTargetSessions: value.weeklyTargetSessions ?? 1,
  });
  res.status(201).json(successResponse(goal, 'Goal created'));
});

router.put('/:id', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json(errorResponse('Invalid goal ID'));
  const updates = {};
  ['title', 'targetDate', 'status', 'progress', 'milestones', 'skillName', 'weeklyTargetSessions', 'pathSteps', 'weeklyCompletedSessions'].forEach((k) => {
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
