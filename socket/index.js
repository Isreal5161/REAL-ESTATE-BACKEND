const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

function setupSocket(server) {
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Store online users
    const onlineUsers = new Map();

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        
        // Add user to online users
        onlineUsers.set(userId, socket.id);
        
        // Broadcast online status
        socket.broadcast.emit('user_online', userId);

        // Join personal room for direct messages
        socket.join(userId);

        // Handle disconnect
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            io.emit('user_offline', userId);
        });

        // Handle typing status
        socket.on('typing_start', (receiverId) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('typing_start', userId);
            }
        });

        socket.on('typing_end', (receiverId) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('typing_end', userId);
            }
        });

        // Handle read receipts
        socket.on('message_read', async (data) => {
            const { conversationId, senderId } = data;
            const senderSocketId = onlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('message_read', {
                    conversationId,
                    readBy: userId
                });
            }
        });
    });

    return io;
}

module.exports = setupSocket;