const mongoose = require('mongoose');

const payoutMethodSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['bank_transfer', 'mobile_money'],
        required: true
    },
    details: {
        // Bank Transfer
        accountNumber: String,
        accountName: String,
        bankName: String,

        // Mobile Money
        phoneNumber: String,
        provider: {
            type: String,
            enum: ['MTN', 'Orange']
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
payoutMethodSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const PayoutMethod = mongoose.model('PayoutMethod', payoutMethodSchema);

module.exports = PayoutMethod;