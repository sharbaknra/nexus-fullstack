const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route GET /api/users/investors
router.get('/investors', protect, async (req, res) => {
  try {
    const investors = await User.find({ role: 'investor' }).select('-password');
    res.json(investors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/users/entrepreneurs
router.get('/entrepreneurs', protect, async (req, res) => {
  try {
    const entrepreneurs = await User.find({ role: 'entrepreneur' }).select('-password');
    res.json(entrepreneurs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
