const express = require('express');
const router = express.Router();
const multer = require('multer');
const Verification = require('../models/verification');
const auth = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/verification-docs')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
    }
});

// Submit verification documents
router.post('/submit', auth, upload.array('documents', 5), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Create document URLs
        const documentUrls = files.map(file => `/uploads/verification-docs/${file.filename}`);

        // Create new verification request
        const verification = new Verification({
            userId: req.user._id,
            documentType: req.body.documentType,
            documentUrls: documentUrls,
            metadata: {
                documentNames: files.map(f => f.originalname),
                documentTypes: files.map(f => f.mimetype),
                uploadedFrom: req.get('user-agent')
            }
        });

        await verification.save();

        res.status(201).json({
            message: 'Verification documents submitted successfully',
            verificationId: verification._id,
            status: verification.status
        });

    } catch (error) {
        console.error('Verification submission error:', error);
        res.status(500).json({ message: 'Error submitting verification documents' });
    }
});

// Get verification status
router.get('/status', auth, async (req, res) => {
    try {
        const verification = await Verification.findOne({ 
            userId: req.user._id 
        }).sort({ submissionDate: -1 });

        if (!verification) {
            return res.status(404).json({ message: 'No verification requests found' });
        }

        res.json({
            status: verification.status,
            submissionDate: verification.submissionDate,
            reviewDate: verification.reviewDate,
            rejectionReason: verification.rejectionReason,
            resubmissionCount: verification.resubmissionCount
        });

    } catch (error) {
        console.error('Verification status check error:', error);
        res.status(500).json({ message: 'Error checking verification status' });
    }
});

// Resubmit verification
router.post('/resubmit', auth, upload.array('documents', 5), async (req, res) => {
    try {
        const currentVerification = await Verification.findOne({ 
            userId: req.user._id,
            status: 'rejected'
        }).sort({ submissionDate: -1 });

        if (!currentVerification) {
            return res.status(400).json({ message: 'No rejected verification request found' });
        }

        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        // Create new verification with resubmission
        const documentUrls = files.map(file => `/uploads/verification-docs/${file.filename}`);
        
        const verification = new Verification({
            userId: req.user._id,
            documentType: req.body.documentType,
            documentUrls: documentUrls,
            resubmissionCount: currentVerification.resubmissionCount + 1,
            metadata: {
                documentNames: files.map(f => f.originalname),
                documentTypes: files.map(f => f.mimetype),
                uploadedFrom: req.get('user-agent')
            }
        });

        await verification.save();

        res.status(201).json({
            message: 'Verification documents resubmitted successfully',
            verificationId: verification._id,
            status: verification.status
        });

    } catch (error) {
        console.error('Verification resubmission error:', error);
        res.status(500).json({ message: 'Error resubmitting verification documents' });
    }
});

module.exports = router;