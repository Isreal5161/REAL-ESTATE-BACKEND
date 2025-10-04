const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: false
    },
    profilePicture: {
        type: String,
        default: null
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified'
    },
    verificationDocuments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        path: String,
        uploadDate: Date
    }],
    twoFactorSecret: String,
    twoFactorTemp: String,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    settings: {
        theme: {
            type: String,
            default: 'light'
        },
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'XAF'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            }
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'private', 'contacts'],
                default: 'public'
            },
            showOnlineStatus: {
                type: Boolean,
                default: true
            }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);