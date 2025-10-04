const axios = require('axios');
const config = require('../config');

// Process payout request
async function processPayout(transaction, payoutMethod) {
    // Check if we're in development/sandbox mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    try {
        if (isDevelopment) {
            // In development, simulate successful payout after 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return {
                status: 'completed',
                message: '[Development Mode] Payout processed successfully',
                referenceId: `DEV-${Date.now()}`,
                failureReason: null
            };
        }

        // Production Mode:
        // Mobile Money Payout
        if (payoutMethod.type === 'mobile_money') {
            return await processMobileMoneyPayout(transaction, payoutMethod);
        }
        
        // Bank Transfer
        if (payoutMethod.type === 'bank_transfer') {
            return await processBankTransfer(transaction, payoutMethod);
        }

        throw new Error('Unsupported payout method');
    } catch (error) {
        console.error('Payout processing error:', error);
        return {
            status: 'failed',
            message: 'Failed to process payout',
            failureReason: error.message,
            referenceId: null
        };
    }
}

// Process Mobile Money Payout
async function processMobileMoneyPayout(transaction, payoutMethod) {
    const { provider, phoneNumber } = payoutMethod.details;
    const providerConfig = provider === 'mtn' ? config.mtn : config.orange;

    if (!providerConfig) {
        throw new Error('Invalid mobile money provider');
    }

    try {
        // Call Mobile Money API
        const response = await axios.post(`${providerConfig.apiUrl}/disbursement`, {
            phoneNumber,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            externalId: transaction._id.toString()
        }, {
            headers: {
                'Authorization': `Bearer ${providerConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            status: 'completed',
            message: 'Payout processed successfully',
            referenceId: response.data.transactionId
        };
    } catch (error) {
        throw new Error(`Mobile money payout failed: ${error.message}`);
    }
}

// Process Bank Transfer
async function processBankTransfer(transaction, payoutMethod) {
    const { accountNumber, accountName, bankName } = payoutMethod.details;

    // Implement bank transfer logic here
    // This is a placeholder - you'll need to integrate with your bank's API
    try {
        // Simulate bank transfer processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            status: 'pending', // Bank transfers typically take time to process
            message: 'Bank transfer initiated',
            referenceId: `BT${Date.now()}`,
        };
    } catch (error) {
        throw new Error(`Bank transfer failed: ${error.message}`);
    }
}

module.exports = {
    processPayout
};