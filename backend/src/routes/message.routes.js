const express = require('express');
const Joi = require('joi');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

// GET /api/messages/conversations — list my conversations
router.get('/conversations', protect, async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate('participants', 'username profile')
    .sort({ 'lastMessage.createdAt': -1 })
    .lean();

  // Add unread count for current user
  const result = conversations.map(c => ({
    ...c,
    unread: c.unreadCount?.get?.(req.user._id.toString()) || (c.unreadCount?.[req.user._id.toString()] || 0),
  }));

  res.json(successResponse(result, 'Conversations fetched'));
});

// GET /api/messages/:conversationId — get messages for a conversation
router.get('/:conversationId', protect, async (req, res) => {
  const { conversationId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
  const skip = (page - 1) * limit;

  // Verify user is a participant
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json(errorResponse('Conversation not found'));
  }

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId }),
  ]);

  // Mark messages as read
  await Message.updateMany(
    {
      conversationId,
      senderId: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    },
    { $addToSet: { readBy: req.user._id } }
  );

  // Reset unread count
  await Conversation.findByIdAndUpdate(conversationId, {
    [`unreadCount.${req.user._id}`]: 0,
  });

  res.json(successResponse({
    messages: messages.reverse(),
    page,
    totalPages: Math.ceil(total / limit),
    total,
  }, 'Messages fetched'));
});

// POST /api/messages/:conversationId — send a message (REST fallback)
router.post('/:conversationId', protect, async (req, res) => {
  const { conversationId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json(errorResponse('Message text is required'));
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    return res.status(404).json(errorResponse('Conversation not found'));
  }

  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    text: text.trim(),
    readBy: [req.user._id],
  });

  // Update conversation's last message and increment unread for the other user
  const otherId = conversation.participants.find(
    p => p.toString() !== req.user._id.toString()
  );

  const currentUnread = conversation.unreadCount?.get?.(otherId.toString())
    || conversation.unreadCount?.[otherId.toString()] || 0;

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      text: text.trim(),
      senderId: req.user._id,
      createdAt: message.createdAt,
    },
    [`unreadCount.${otherId}`]: currentUnread + 1,
  });

  res.status(201).json(successResponse(message, 'Message sent'));
});

module.exports = router;
