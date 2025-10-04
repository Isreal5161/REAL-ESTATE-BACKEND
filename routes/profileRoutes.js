const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/user.js');
const twofactor = require('node-2fa');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/verification')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Get profile data
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile data' });
    }
});

// Update profile data with real-time sync
router.put('/', auth, async (req, res) => {
    try {
        const updates = req.body;
        const user = await User.findById(req.user._id);
        
        // Update user fields
        Object.keys(updates).forEach(key => {
            if (key !== 'password' && key !== '_id') {
                user[key] = updates[key];
            }
        });
        
        await user.save();
        
        // Remove sensitive data
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: 'Error updating profile' });
    }
});

// Initialize 2FA
router.post('/2fa/setup', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Generate new secret
        const newSecret = twofactor.generateSecret({
            name: "CribzConnect",
            account: user.email
        });
        
        // Save secret temporarily
        user.twoFactorTemp = newSecret.secret;
        await user.save();
        
        res.json({
            secret: newSecret.secret,
            qr: newSecret.qr,
            uri: newSecret.uri
        });
    } catch (error) {
        res.status(500).json({ message: 'Error setting up 2FA' });
    }
});

// Verify and Enable 2FA
router.post('/2fa/verify', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!user.twoFactorTemp) {
            return res.status(400).json({ message: '2FA setup not initiated' });
        }
        
        const result = twofactor.verifyToken(user.twoFactorTemp, token);
        
        if (result && result.delta === 0) {
            user.twoFactorSecret = user.twoFactorTemp;
            user.twoFactorEnabled = true;
            user.twoFactorTemp = undefined;
            await user.save();
            
            res.json({ message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid verification code' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error verifying 2FA' });
    }
});

// Upload verification documents
router.post('/verification/documents', auth, upload.array('documents', 3), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const user = await User.findById(req.user._id);
        const fileDetails = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            path: file.path,
            uploadDate: new Date()
        }));

        user.verificationDocuments = fileDetails;
        user.verificationStatus = 'pending';
        await user.save();

        // Send notification to admin (you can implement this later)
        // notifyAdmin(user._id, 'New verification documents uploaded');

        res.json({ 
            message: 'Documents uploaded successfully',
            status: 'pending',
            documents: fileDetails
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading documents' });
    }
});

// Get verification status
router.get('/verification/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('verificationStatus verificationDocuments');
        res.json({
            status: user.verificationStatus,
            documents: user.verificationDocuments,
            lastUpdate: user.updatedAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching verification status' });
    }
});

// Save advanced settings
router.put('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.settings = { ...user.settings, ...req.body };
        await user.save();
        
        res.json({
            message: 'Settings updated successfully',
            settings: user.settings
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Get settings
router.get('/settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('settings');
        res.json(user.settings || {});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

module.exports = router;