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

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

module.exports = mongoose.model('User', userSchema);