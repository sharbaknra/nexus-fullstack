const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');

// @route POST /api/meetings - Schedule a meeting
router.post('/', protect, async (req, res) => {
  try {
    const { title, scheduledWith, date, duration, message, meetingLink } = req.body;

    // Conflict detection - check if either user has a meeting at that time
    const meetingDate = new Date(date);
    const meetingEnd = new Date(meetingDate.getTime() + (duration || 60) * 60000);

    const conflict = await Meeting.findOne({
      status: 'accepted',
      $or: [
        { scheduledBy: req.user._id },
        { scheduledWith: req.user._id },
        { scheduledBy: scheduledWith },
        { scheduledWith: scheduledWith }
      ],
      date: { $lt: meetingEnd },
      $expr: {
        $gt: [{ $add: ['$date', { $multiply: ['$duration', 60000] }] }, meetingDate]
      }
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot conflicts with an existing meeting' });
    }

    const meeting = await Meeting.create({
      title, scheduledBy: req.user._id, scheduledWith, date, duration, message, meetingLink
    });

    await meeting.populate('scheduledBy scheduledWith', 'name email avatarUrl role');
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/meetings - Get all meetings for logged in user
router.get('/', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ scheduledBy: req.user._id }, { scheduledWith: req.user._id }]
    })
    .populate('scheduledBy scheduledWith', 'name email avatarUrl role')
    .sort({ date: 1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/meetings/:id - Accept or reject a meeting
router.put('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.scheduledWith.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this meeting' });
    }

    meeting.status = req.body.status;
    await meeting.save();
    await meeting.populate('scheduledBy scheduledWith', 'name email avatarUrl role');
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/meetings/:id - Cancel a meeting
router.delete('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    if (meeting.scheduledBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this meeting' });
    }

    meeting.status = 'cancelled';
    await meeting.save();
    res.json({ message: 'Meeting cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
