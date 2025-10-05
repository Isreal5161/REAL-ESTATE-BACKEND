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
// Allow all origins in development to simplify local testing (restrict in production)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
const io = require('socket.io')(server, {
    cors: {
        origin: true,
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
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Friendly root route so visiting the backend URL in a browser doesn't return "Cannot GET /"
app.get('/', (req, res) => {
    // If browser accepts HTML, send a small HTML page; otherwise send JSON
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
        return res.send(`
            <html>
                <head><title>Real Estate Backend</title></head>
                <body style="font-family: Arial, sans-serif; line-height:1.6; padding:2rem;">
                    <h1>Real Estate Backend</h1>
                    <p>Server is running. Use the <code>/api/health</code> endpoint for a JSON health check.</p>
                </body>
            </html>
        `);
    }
    res.json({ status: 'Real Estate Backend', api: '/api', timestamp: new Date().toISOString() });
});

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/payouts', payoutRoutes);

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

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
        // Support tokens that use either `userId` or `id` in the payload
        socket.agentId = decoded.userId || decoded.id || decoded.sub;
        if (!socket.agentId) {
            return next(new Error('Authentication error: missing user id in token'));
        }
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

// Verify model files exist
const fs = require('fs');
const path = require('path');
const userModelPath = path.join(__dirname, 'models', 'user.js');

if (!fs.existsSync(userModelPath)) {
    console.error(`Error: User model file not found at ${userModelPath}`);
    process.exit(1);
}

// Database connection
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    // Start server after successful database connection
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if database connection fails
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));
