const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');
const { logActivity } = require('../services/activity.service');
const { notifyNewMessage } = require('../services/notification.service');
const { trackFirstMessageIfNeeded } = require('../services/analytics.service');
const { isBlockedEitherWay } = require('../services/trust.service');
const { markReplied } = require('../services/matching-feedback.service');

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
  if (!isValidObjectId(conversationId)) {
    return res.status(400).json(errorResponse('Invalid conversation ID'));
  }
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

  res.json(successResponse({
    messages: messages.reverse(),
    page,
    totalPages: Math.ceil(total / limit),
    total,
  }, 'Messages fetched'));

  // Perform read-side effects after responding to keep message load snappy.
  Promise.allSettled([
    Message.updateMany(
      {
        conversationId,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    ),
    Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${req.user._id}`]: 0,
    }),
  ]);
});

// POST /api/messages/:conversationId — send a message (REST fallback)
router.post('/:conversationId', protect, async (req, res) => {
  const { conversationId } = req.params;
  if (!isValidObjectId(conversationId)) {
    return res.status(400).json(errorResponse('Invalid conversation ID'));
  }
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

  const otherId = conversation.participants.find(
    p => p.toString() !== req.user._id.toString()
  );

  if (otherId && await isBlockedEitherWay(req.user._id, otherId)) {
    return res.status(403).json(errorResponse('Cannot message this user'));
  }

  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    text: text.trim(),
    readBy: [req.user._id],
  });

  // Update conversation's last message and increment unread for the other user
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
  await logActivity({
    actor: req.user._id,
    targetUser: otherId,
    type: 'message_sent',
    title: 'Sent a new message',
    description: text.trim().slice(0, 80),
    metadata: { conversationId, messageId: message._id },
    visibility: 'private',
  });
  trackFirstMessageIfNeeded(req.user._id, conversationId).catch(() => {});
  if (conversation.matchId && otherId) {
    markReplied(conversation.matchId, req.user._id, otherId).catch(() => {});
  }
  const sender = await User.findById(req.user._id).select('username profile').lean();
  const fromName = sender?.profile?.firstName || sender?.username || 'New message';
  notifyNewMessage(otherId, fromName, text.trim(), conversationId).catch(() => {});

  res.status(201).json(successResponse(message, 'Message sent'));
});

module.exports = router;
