const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PayoutMethod = require('../models/payoutMethod');
const Transaction = require('../models/transaction');
const Balance = require('../models/balance');

// Get user's balance
router.get('/balance', auth, async (req, res) => {
    try {
        let balance = await Balance.findOne({ userId: req.user._id });
        
        if (!balance) {
            balance = new Balance({ userId: req.user._id });
            await balance.save();
        }

        res.json({
            availableBalance: balance.availableBalance,
            pendingBalance: balance.pendingBalance,
            currency: balance.currency,
            canRequestPayout: balance.canRequestPayout(),
            minimumPayoutAmount: balance.minimumPayoutAmount
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ message: 'Error fetching balance information' });
    }
});

// Get payout methods
router.get('/payout-methods', auth, async (req, res) => {
    try {
        const methods = await PayoutMethod.find({ userId: req.user._id });
        res.json(methods);
    } catch (error) {
        console.error('Error fetching payout methods:', error);
        res.status(500).json({ message: 'Error fetching payout methods' });
    }
});

// Add new payout method
router.post('/payout-methods', auth, async (req, res) => {
    try {
        const { type, details } = req.body;
        
        // Validate required fields based on type
        if (!validatePayoutMethodDetails(type, details)) {
            return res.status(400).json({ message: 'Invalid or missing details for selected payout method' });
        }

        const payoutMethod = new PayoutMethod({
            userId: req.user._id,
            type,
            details
        });

        await payoutMethod.save();
        res.status(201).json(payoutMethod);
    } catch (error) {
        console.error('Error adding payout method:', error);
        res.status(500).json({ message: 'Error adding payout method' });
    }
});

// Request payout
router.post('/request', auth, async (req, res) => {
    try {
        const { amount, payoutMethodId } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid payout amount' });
        }

        // Get user's balance
        const balance = await Balance.findOne({ userId: req.user._id });
        if (!balance) {
            return res.status(404).json({ message: 'Balance record not found' });
        }

        // Check minimum payout amount
        if (amount < balance.minimumPayoutAmount) {
            return res.status(400).json({ 
                message: `Minimum payout amount is ${balance.minimumPayoutAmount} ${balance.currency}`
            });
        }

        // Check if balance is sufficient
        if (amount > balance.availableBalance) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Verify payout method exists and belongs to user
        const payoutMethod = await PayoutMethod.findOne({
            _id: payoutMethodId,
            userId: req.user._id,
            status: 'active'
        });

        if (!payoutMethod) {
            return res.status(404).json({ message: 'Invalid or inactive payout method' });
        }

        // Create transaction record
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'payout',
            amount,
            currency: balance.currency,
            payoutMethodId,
            description: `Payout via ${payoutMethod.type}`
        });

        // Update balance
        balance.payoutPending = true;
        await balance.updateBalance(amount, 'payout');
        await transaction.save();

        // Here you would integrate with your payment provider
        // For now, we'll simulate the process
        setTimeout(async () => {
            try {
                transaction.status = 'completed';
                transaction.processedAt = new Date();
                await transaction.save();

                balance.payoutPending = false;
                await balance.save();
            } catch (error) {
                console.error('Error processing payout:', error);
            }
        }, 5000);

        res.json({
            message: 'Payout request submitted successfully',
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Error requesting payout:', error);
        res.status(500).json({ message: 'Error processing payout request' });
    }
});

// Get transaction history
router.get('/transactions', auth, async (req, res) => {
    try {
        const { type, status, page = 1, limit = 10 } = req.query;
        const query = { userId: req.user._id };

        if (type) query.type = type;
        if (status) query.status = status;

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('payoutMethodId', 'type details');

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Error fetching transaction history' });
    }
});

// Helper function to validate payout method details
function validatePayoutMethodDetails(type, details) {
    switch (type) {
        case 'bank_transfer':
            return details.accountNumber && details.accountName && details.bankName;
        case 'paypal':
            return details.paypalEmail;
        case 'mobile_money':
            return details.phoneNumber && details.provider;
        case 'skrill':
            return details.skrillEmail;
        default:
            return false;
    }
}

module.exports = router;