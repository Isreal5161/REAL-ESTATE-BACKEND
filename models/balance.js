const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    availableBalance: {
        type: Number,
        default: 0
    },
    pendingBalance: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'XAF'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    payoutPending: {
        type: Boolean,
        default: false
    },
    minimumPayoutAmount: {
        type: Number,
        default: 50000 // 50,000 XAF
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalPaidOut: {
        type: Number,
        default: 0
    }
});

// Method to check if balance meets minimum payout threshold
balanceSchema.methods.canRequestPayout = function() {
    return this.availableBalance >= this.minimumPayoutAmount;
};

// Method to update balance
balanceSchema.methods.updateBalance = async function(amount, type) {
    if (type === 'earning') {
        this.pendingBalance += amount;
        this.totalEarned += amount;
    } else if (type === 'release') {
        this.pendingBalance -= amount;
        this.availableBalance += amount;
    } else if (type === 'payout') {
        this.availableBalance -= amount;
        this.totalPaidOut += amount;
    }
    
    this.lastUpdated = new Date();
    return this.save();
};

const Balance = mongoose.model('Balance', balanceSchema);

module.exports = Balance;