require("dotenv").config();
// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require('jsonwebtoken');


const app = express();
const PORT = process.env.PORT || 5000;
const server = require('http').createServer(app);

// Configure CORS
app.use(cors({
    origin: ['https://new-dashboard-admin-dasbboard.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
const io = require('socket.io')(server, {
    cors: {
        origin: ["https://new-dashboard-admin-dasbboard.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Import routes
const bookingRoutes = require('./routes/bookingRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const listingRoutes = require('./routes/listingRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const authRoutes = require('./routes/authRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/payouts', payoutRoutes);

// Socket.IO Authentication and Connection Management
const connectedAgents = new Map(); // Store agent socket connections

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    // Verify JWT token and store agent information
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.agentId = decoded.id;
        next();
    });
});

io.on('connection', (socket) => {
    console.log('Agent connected:', socket.agentId);
    connectedAgents.set(socket.agentId, socket);

    socket.on('disconnect', () => {
        console.log('Agent disconnected:', socket.agentId);
        connectedAgents.delete(socket.agentId);
    });
});

// Make io accessible to our routes
app.set('io', io);
app.set('connectedAgents', connectedAgents);

// Database connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
app.use("/api/payouts", payoutRoutes);
app.use("/api/bookings", bookingRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    // Changed from app.listen to server.listen to enable Socket.IO
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((error) => console.error("MongoDB connection error:", error));
