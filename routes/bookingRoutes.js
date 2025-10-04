const express = require('express');
const router = express.Router();
const Booking = require('../models/booking');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Get all bookings for an agent
router.get('/agent-bookings', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const bookings = await Booking.getAgentBookings(
            req.user._id,
            startDate ? new Date(startDate) : new Date(),
            endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days ahead
        );
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching agent bookings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new booking
router.post('/', [
    auth,
    [
        check('propertyId', 'Property ID is required').not().isEmpty(),
        check('clientName', 'Client name is required').not().isEmpty(),
        check('clientEmail', 'Valid client email is required').isEmail(),
        check('clientPhone', 'Client phone is required').not().isEmpty(),
        check('viewingDate', 'Valid viewing date is required').isISO8601(),
        check('duration', 'Duration must be a number').isNumeric()
    ]
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const booking = new Booking({
            ...req.body,
            agentId: req.user._id
        });

        // Check if the time slot is available
        const isAvailable = await booking.isTimeSlotAvailable();
        if (!isAvailable) {
            return res.status(400).json({ message: 'This time slot is not available' });
        }

        await booking.save();

        // TODO: Send email notifications
        // TODO: Create calendar event

        res.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a booking
router.put('/:id', [
    auth,
    [
        check('status', 'Status is required').isIn(['pending', 'confirmed', 'cancelled', 'completed'])
    ]
], async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify the agent owns this booking
        if (booking.agentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // If updating date/time, check availability
        if (req.body.viewingDate && req.body.viewingDate !== booking.viewingDate.toISOString()) {
            const newBooking = new Booking({
                ...booking.toObject(),
                ...req.body
            });
            const isAvailable = await newBooking.isTimeSlotAvailable();
            if (!isAvailable) {
                return res.status(400).json({ message: 'New time slot is not available' });
            }
        }

        // Update booking
        Object.assign(booking, req.body);
        await booking.save();

        // TODO: Send notification about booking update
        // TODO: Update calendar event

        res.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a booking
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Verify the agent owns this booking
        if (booking.agentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await booking.remove();

        // TODO: Send cancellation notification
        // TODO: Remove calendar event

        res.json({ message: 'Booking removed' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get booking statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const now = new Date();
        const stats = {
            upcoming: await Booking.countDocuments({
                agentId: req.user._id,
                viewingDate: { $gt: now },
                status: { $in: ['pending', 'confirmed'] }
            }),
            completed: await Booking.countDocuments({
                agentId: req.user._id,
                status: 'completed'
            }),
            cancelled: await Booking.countDocuments({
                agentId: req.user._id,
                status: 'cancelled'
            }),
            today: await Booking.countDocuments({
                agentId: req.user._id,
                viewingDate: {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lt: new Date(now.setHours(23, 59, 59, 999))
                },
                status: { $in: ['pending', 'confirmed'] }
            })
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching booking stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;