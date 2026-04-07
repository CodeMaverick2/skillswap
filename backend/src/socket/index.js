const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
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

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: ${userId}`);

    // Join conversation rooms
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Send message
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, text } = data;
        if (!text?.trim() || !conversationId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) return;

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

        // Emit to conversation room
        io.to(`conv:${conversationId}`).emit('new_message', {
          ...message.toObject(),
          conversationId,
        });

        // Notify the other user (for badge updates etc.)
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

    // Mark messages as read
    socket.on('mark_read', async ({ conversationId }) => {
      try {
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

        // Notify the other person that messages were read
        io.to(`conv:${conversationId}`).emit('messages_read', {
          conversationId,
          readBy: userId,
        });
      } catch (err) {
        logger.error(`Socket mark_read error: ${err.message}`);
      }
    });

    // Typing indicator
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  return io;
}

module.exports = { initSocket };
