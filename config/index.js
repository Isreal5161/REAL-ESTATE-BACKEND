require('dotenv').config();

const config = {
    // Server Configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // MongoDB
    mongoUri: process.env.MONGO_URI,
    
    // JWT
    jwtSecret: process.env.JWT_SECRET,
    
    // MTN Mobile Money
    mtn: {
        apiUrl: process.env.MTN_API_URL,
        apiKey: process.env.MTN_API_KEY,
        apiSecret: process.env.MTN_API_SECRET,
        environment: process.env.MTN_ENVIRONMENT,
        callbackUrl: process.env.MTN_CALLBACK_URL,
    },
    
    // Orange Money
    orange: {
        apiUrl: process.env.ORANGE_API_URL,
        apiKey: process.env.ORANGE_API_KEY,
        apiSecret: process.env.ORANGE_API_SECRET,
        merchantId: process.env.ORANGE_MERCHANT_ID,
        callbackUrl: process.env.ORANGE_CALLBACK_URL,
    },
    
    // Payment Configuration
    payment: {
        minPayoutAmount: parseInt(process.env.MIN_PAYOUT_AMOUNT) || 50000,
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'XAF',
        payoutFeePercentage: parseFloat(process.env.PAYOUT_FEE_PERCENTAGE) || 2.5,
    },
    
    // Bank Transfer
    bank: {
        apiUrl: process.env.BANK_API_URL,
        apiKey: process.env.BANK_API_KEY,
        apiSecret: process.env.BANK_API_SECRET,
    },
    
    // Email Configuration
    email: {
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        fromEmail: process.env.FROM_EMAIL,
        adminEmail: process.env.ADMIN_EMAIL,
        supportEmail: process.env.SUPPORT_EMAIL,
    },
    
    // Security
    security: {
        apiRateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
        apiRateWindow: process.env.API_RATE_WINDOW || '15m',
        encryptionKey: process.env.ENCRYPTION_KEY,
        webhookSecret: process.env.WEBHOOK_SECRET,
    },

    // Validation function to check required environment variables.
    // In development we only require the critical ones (MONGO_URI and JWT_SECRET)
    // to make it easier to run locally. Production should set all required keys.
    validate() {
        const required = [
            'MONGO_URI',
            'JWT_SECRET'
        ];

        const missing = required.filter(key => !process.env[key]);

        if (process.env.NODE_ENV === 'production' && missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // If not in production, warn but don't throw for non-critical vars
        if (missing.length > 0) {
            console.warn(`Warning: Missing environment variables (only critical enforced in development): ${missing.join(', ')}`);
        }

        return true;
    }
};

// Validate environment variables when importing this config
config.validate();

module.exports = config;