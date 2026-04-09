const express = require('express');
const Referral = require('../models/Referral');
const protect = require('../middleware/auth.middleware');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

router.get('/me', protect, async (req, res) => {
  const referrals = await Referral.find({ referrer: req.user._id })
    .populate('referee', 'username profile createdAt')
    .sort({ createdAt: -1 })
    .lean();
  res.json(successResponse({ code: req.user.referralCode, referrals }, 'Referrals fetched'));
});

module.exports = router;
