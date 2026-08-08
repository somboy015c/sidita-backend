const express = require('express');
const Message = require('../models/Message');
const Customer = require('../models/Customer');
const { requireAdmin } = require('../middleware/auth');
const { requireCustomer } = require('../middleware/customerAuth');
const { sendCustomerMessageEmail, sendAdminMessageNotifyEmail } = require('../lib/email');

const router = express.Router();

// ─── Customer side ─────────────────────────────────────────
// (registered before the /:customerId admin routes so "mine" is never treated as an id)

// GET /api/messages/mine/thread - customer only, their own thread
router.get('/mine/thread', requireCustomer, async (req, res) => {
  try {
    const messages = await Message.find({ customer: req.customer.id }).sort({ createdAt: 1 });
    await Message.updateMany(
      { customer: req.customer.id, sender: 'admin', readByCustomer: false },
      { $set: { readByCustomer: true } }
    );
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load your messages', details: err.message });
  }
});

// POST /api/messages/mine/thread - customer only, send a reply
router.post('/mine/thread', requireCustomer, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const message = await Message.create({
      customer: req.customer.id,
      sender: 'customer',
      senderName: req.customer.name,
      body: body.trim(),
      readByCustomer: true
    });

    const customer = { name: req.customer.name, email: req.customer.email, phone: req.customer.phone };
    sendAdminMessageNotifyEmail(customer, message.body)
      .catch((err) => console.error('[email] admin message notify failed:', err.message));

    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: 'Failed to send message', details: err.message });
  }
});

// ─── Admin side ────────────────────────────────────────────

// GET /api/messages/:customerId - admin only, full thread with one customer
router.get('/:customerId', requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId).select('name email phone');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const messages = await Message.find({ customer: req.params.customerId }).sort({ createdAt: 1 });
    await Message.updateMany(
      { customer: req.params.customerId, sender: 'customer', readByAdmin: false },
      { $set: { readByAdmin: true } }
    );

    res.json({ customer, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load messages', details: err.message });
  }
});

// POST /api/messages/:customerId - admin only, send a message to a customer
router.post('/:customerId', requireAdmin, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const customer = await Customer.findById(req.params.customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const message = await Message.create({
      customer: customer._id,
      sender: 'admin',
      senderName: req.admin.name || 'SIDITA Support',
      body: body.trim(),
      readByAdmin: true
    });

    sendCustomerMessageEmail(customer, message.body, message.senderName)
      .catch((err) => console.error('[email] customer message notify failed:', err.message));

    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: 'Failed to send message', details: err.message });
  }
});

module.exports = router;
