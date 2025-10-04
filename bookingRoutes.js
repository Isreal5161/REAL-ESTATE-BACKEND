// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

// Create Booking schema
const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
    },
    propertyTitle: {
        type: String,
        required: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    clientName: {
        type: String,
        required: true
    },
    clientEmail: {
        type: String,
        required: true
    },
    clientPhone: {
        type: String,
        required: true
    },
    viewingDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Booking = mongoose.model('Booking', BookingSchema);

// Create a new booking
router.post('/', [
    auth,
    [
        check('propertyId', 'Property ID is required').not().isEmpty(),
        check('clientName', 'Client name is required').not().isEmpty(),
        check('clientEmail', 'Valid client email is required').isEmail(),
        check('clientPhone', 'Client phone is required').not().isEmpty(),
        check('viewingDate', 'Valid viewing date is required').isISO8601(),
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // First, get the property details to find the agent
        const property = await Listing.findById(req.body.propertyId)
            .populate('agent', 'name email');

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        const booking = new Booking({
            ...req.body,
            agentId: property.agent._id, // Use the property's agent ID
            propertyTitle: property.title // Store property title for notifications
        });

        await booking.save();

        // Get socket.io instance and connected agents
        const io = req.app.get('io');
        const connectedAgents = req.app.get('connectedAgents');

        // Send notification to the specific agent if they're online
        const agentSocket = connectedAgents.get(property.agent._id.toString());
        if (agentSocket) {
            agentSocket.emit('newBooking', {
                _id: booking._id,
                propertyId: booking.propertyId,
                propertyTitle: property.title,
                clientName: booking.clientName,
                clientEmail: booking.clientEmail,
                clientPhone: booking.clientPhone,
                viewingDate: booking.viewingDate,
                status: booking.status,
                agentId: property.agent._id
            });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get bookings for the authenticated agent
router.get('/my-bookings', auth, async (req, res) => {
    try {
        const bookings = await Booking.find({ agentId: req.user._id })
            .populate('propertyId', 'title address')
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update booking status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify the booking belongs to the authenticated agent
        if (booking.agentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = status;
        await booking.save();

        res.json(booking);
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;