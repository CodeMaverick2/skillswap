const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { logger } = require('../utils/logger');

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware — verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Helper: verify user is participant in conversation
  async function verifyParticipant(userId, conversationId) {
    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) return false;
    const conv = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    }).select('_id').lean();
    return !!conv;
  }

  // Track verified conversations per socket to avoid repeated DB lookups
  const verifiedRooms = new Map(); // socketId -> Set<conversationId>

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    verifiedRooms.set(socket.id, new Set());
    logger.info(`Socket connected: ${userId}`);

    // Join conversation rooms — with membership verification
    socket.on('join_conversation', async (conversationId) => {
      const isParticipant = await verifyParticipant(userId, conversationId);
      if (!isParticipant) return; // silently reject unauthorized joins
      socket.join(`conv:${conversationId}`);
      verifiedRooms.get(socket.id)?.add(conversationId);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
      verifiedRooms.get(socket.id)?.delete(conversationId);
    });

    // Send message
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, text } = data;
        if (!text?.trim() || !conversationId) return;
        if (text.trim().length > 2000) {
          if (callback) callback({ success: false, error: 'Message too long' });
          return;
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) {
          if (callback) callback({ success: false, error: 'Conversation not found' });
          return;
        }

        const message = await Message.create({
          conversationId,
          senderId: userId,
          text: text.trim(),
          readBy: [userId],
        });

        const otherId = conversation.participants.find(
          p => p.toString() !== userId
        );

        const currentUnread = conversation.unreadCount?.get?.(otherId.toString())
          || conversation.unreadCount?.[otherId.toString()] || 0;

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: {
            text: text.trim(),
            senderId: userId,
            createdAt: message.createdAt,
          },
          [`unreadCount.${otherId}`]: currentUnread + 1,
        });

        io.to(`conv:${conversationId}`).emit('new_message', {
          ...message.toObject(),
          conversationId,
        });

        io.to(`user:${otherId}`).emit('message_notification', {
          conversationId,
          senderId: userId,
          text: text.trim(),
        });

        if (callback) callback({ success: true, message });
      } catch (err) {
        logger.error(`Socket send_message error: ${err.message}`);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Mark messages as read — verify membership
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        if (!verifiedRooms.get(socket.id)?.has(conversationId)) return;

        await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: userId },
            readBy: { $ne: userId },
          },
          { $addToSet: { readBy: userId } }
        );

        await Conversation.findByIdAndUpdate(conversationId, {
          [`unreadCount.${userId}`]: 0,
        });

        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: userId,
        });
      } catch (err) {
        logger.error(`Socket mark_read error: ${err.message}`);
      }
    });

    // Typing indicator — only emit if verified in room
    socket.on('typing', ({ conversationId }) => {
      if (!verifiedRooms.get(socket.id)?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!verifiedRooms.get(socket.id)?.has(conversationId)) return;
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      verifiedRooms.delete(socket.id);
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
