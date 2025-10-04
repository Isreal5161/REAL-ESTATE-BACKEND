const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    payoutMethodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PayoutMethod',
        required: true
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    processedDate: Date,
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true
});

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);