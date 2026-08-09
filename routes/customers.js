const express = require('express');
const Customer = require('../models/Customer');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers - admin only, list all registered customer accounts
router.get('/', requireAdmin, async (req, res) => {
  try {
    const customers = await Customer.find().select('name email phone createdAt').sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers', details: err.message });
  }
});

module.exports = router;
