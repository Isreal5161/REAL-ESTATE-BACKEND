const paypal = require('@paypal/payouts-sdk');
const config = require('../config/paypal');

// Create PayPal client
function getPayPalClient() {
    const environment = new paypal.core.SandboxEnvironment(
        config.clientId,
        config.clientSecret
    );
    return new paypal.core.PayPalHttpClient(environment);
}

// Create a payout
async function createPayout(data) {
    const client = getPayPalClient();
    
    const request = new paypal.payouts.PayoutsPostRequest();
    request.requestBody({
        sender_batch_header: {
            sender_batch_id: `Batch_${Date.now()}`,
            email_subject: "You have a payout!",
            email_message: "You have received a payout from CribzConnect."
        },
        items: [{
            recipient_type: "EMAIL",
            amount: {
                value: data.amount,
                currency: "USD"
            },
            receiver: data.paypalEmail,
            note: "Thank you for using CribzConnect!",
            sender_item_id: data.transactionId
        }]
    });

    try {
        const response = await client.execute(request);
        return {
            success: true,
            batchId: response.result.batch_header.payout_batch_id,
            status: response.result.batch_header.batch_status
        };
    } catch (error) {
        console.error('PayPal payout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Check payout status
async function getPayoutStatus(batchId) {
    const client = getPayPalClient();
    const request = new paypal.payouts.PayoutsGetRequest(batchId);
    
    try {
        const response = await client.execute(request);
        return {
            success: true,
            status: response.result.batch_header.batch_status,
            items: response.result.items
        };
    } catch (error) {
        console.error('PayPal status check error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    createPayout,
    getPayoutStatus
};