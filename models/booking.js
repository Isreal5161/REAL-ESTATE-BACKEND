const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    viewingDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        trim: true
    },
    clientPhone: {
        type: String,
        required: true
    },
    clientEmail: {
        type: String,
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        default: 30, // Duration in minutes
        required: true
    },
    cancellationReason: {
        type: String,
        trim: true
    },
    reminderSent: {
        type: Boolean,
        default: false
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

// Indexes for better query performance
bookingSchema.index({ propertyId: 1, viewingDate: 1 });
bookingSchema.index({ agentId: 1, viewingDate: 1 });
bookingSchema.index({ status: 1 });

// Update the updatedAt timestamp before saving
bookingSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Instance method to check if booking time slot is available
bookingSchema.methods.isTimeSlotAvailable = async function() {
    const startTime = new Date(this.viewingDate);
    const endTime = new Date(startTime.getTime() + this.duration * 60000);

    const conflictingBooking = await this.constructor.findOne({
        propertyId: this.propertyId,
        viewingDate: {
            $lt: endTime,
            $gt: startTime
        },
        status: { $in: ['pending', 'confirmed'] },
        _id: { $ne: this._id }
    });

    return !conflictingBooking;
};

// Static method to get agent's bookings for a date range
bookingSchema.statics.getAgentBookings = function(agentId, startDate, endDate) {
    return this.find({
        agentId,
        viewingDate: {
            $gte: startDate,
            $lte: endDate
        }
    })
    .populate('propertyId', 'title location images')
    .populate('clientId', 'name email phone')
    .sort({ viewingDate: 1 });
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;