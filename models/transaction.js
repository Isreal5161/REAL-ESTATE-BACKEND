const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['payout', 'earning', 'refund', 'fee'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'XAF'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    payoutMethodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PayoutMethod'
    },
    description: String,
    metadata: {
        listingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Listing'
        },
        bookingId: String,
        paymentReference: String,
        failureReason: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;