const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const User = require('../models/user.js');
const auth = require('../middleware/auth');

// Get all conversations for current user
router.get('/conversations', auth, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
        .populate('participants', 'name email profilePicture')
        .populate('lastMessage')
        .sort({ lastActivity: -1 });

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations' });
    }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const messages = await Message.find({
            conversationId,
            deleted: false
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('senderId', 'name email profilePicture');

        // Mark messages as read
        await Message.updateMany({
            conversationId,
            receiverId: req.user._id,
            status: { $ne: 'read' }
        }, {
            status: 'read'
        });

        // Update unread count
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const unreadCount = conversation.unreadCount || new Map();
            unreadCount.set(req.user._id.toString(), 0);
            conversation.unreadCount = unreadCount;
            await conversation.save();
        }

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages' });
    }
});

// Send a message
router.post('/send', auth, async (req, res) => {
    try {
        const { receiverId, content, type = 'text', fileUrl } = req.body;

        // Find or create conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [req.user._id, receiverId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [req.user._id, receiverId],
                unreadCount: new Map([[receiverId, 1]])
            });
        } else {
            // Increment unread count for receiver
            const unreadCount = conversation.unreadCount || new Map();
            const currentCount = unreadCount.get(receiverId) || 0;
            unreadCount.set(receiverId, currentCount + 1);
            conversation.unreadCount = unreadCount;
        }

        // Create message
        const message = new Message({
            senderId: req.user._id,
            receiverId,
            content,
            type,
            fileUrl,
            conversationId: conversation._id
        });

        await message.save();

        // Update conversation
        conversation.lastMessage = message._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        // Populate sender details for real-time update
        await message.populate('senderId', 'name email profilePicture');

        res.status(201).json(message);

        // Emit socket event for real-time update (will be implemented later)
        // req.app.get('io').to(receiverId).emit('new_message', message);

    } catch (error) {
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Mark messages as read
router.put('/read/:conversationId', auth, async (req, res) => {
    try {
        const { conversationId } = req.params;

        await Message.updateMany({
            conversationId,
            receiverId: req.user._id,
            status: { $ne: 'read' }
        }, {
            status: 'read'
        });

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
            const unreadCount = conversation.unreadCount || new Map();
            unreadCount.set(req.user._id.toString(), 0);
            conversation.unreadCount = unreadCount;
            await conversation.save();
        }

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking messages as read' });
    }
});

// Delete a message
router.delete('/messages/:messageId', auth, async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.messageId,
            senderId: req.user._id
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        message.deleted = true;
        await message.save();

        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message' });
    }
});

// Get unread count
router.get('/unread', auth, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        });

        let totalUnread = 0;
        conversations.forEach(conv => {
            const unreadCount = conv.unreadCount?.get(req.user._id.toString()) || 0;
            totalUnread += unreadCount;
        });

        res.json({ unreadCount: totalUnread });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count' });
    }
});

module.exports = router;