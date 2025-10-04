const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentType: {
        type: String,
        required: true,
        enum: ['ID', 'proofOfAddress', 'businessDoc', 'other']
    },
    documentUrls: [{
        type: String,
        required: true
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submissionDate: {
        type: Date,
        default: Date.now
    },
    reviewDate: {
        type: Date
    },
    adminNotes: {
        type: String
    },
    rejectionReason: {
        type: String
    },
    resubmissionCount: {
        type: Number,
        default: 0
    },
    metadata: {
        documentNames: [String],
        documentTypes: [String],
        uploadedFrom: String
    }
});

// Add indexes for better query performance
verificationSchema.index({ userId: 1, status: 1 });
verificationSchema.index({ submissionDate: -1 });

// Add methods for status updates
verificationSchema.methods.approve = function(adminId, notes) {
    this.status = 'approved';
    this.reviewDate = new Date();
    this.adminNotes = notes;
    return this.save();
};

verificationSchema.methods.reject = function(adminId, reason) {
    this.status = 'rejected';
    this.reviewDate = new Date();
    this.rejectionReason = reason;
    return this.save();
};

verificationSchema.methods.resubmit = function() {
    this.status = 'pending';
    this.resubmissionCount += 1;
    this.submissionDate = new Date();
    this.rejectionReason = null;
    this.adminNotes = null;
    return this.save();
};

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;