const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const { requireCustomer } = require('../middleware/customerAuth');

const router = express.Router();

function signCustomerToken(customer) {
  return jwt.sign(
    { id: customer._id, scope: 'customer', tokenVersion: customer.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function safeCustomer(customer) {
  return { id: customer._id, name: customer.name, email: customer.email, phone: customer.phone };
}

// POST /api/customer-auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'An account with that email already exists — try signing in instead.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
      passwordHash
    });

    const token = signCustomerToken(customer);
    res.status(201).json({ token, customer: safeCustomer(customer) });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create account', details: err.message });
  }
});

// POST /api/customer-auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const customer = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (!customer) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signCustomerToken(customer);
    res.json({ token, customer: safeCustomer(customer) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /api/customer-auth/me
router.get('/me', requireCustomer, async (req, res) => {
  res.json(req.customer);
});

// POST /api/customer-auth/change-password
router.post('/change-password', requireCustomer, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const customer = await Customer.findById(req.customer.id);
    if (!customer) return res.status(404).json({ error: 'Account not found' });

    const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await Customer.findByIdAndUpdate(customer._id, {
      $set: { passwordHash: newHash },
      $inc: { tokenVersion: 1 }
    });

    res.json({ message: 'Password updated. Please sign in again.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password', details: err.message });
  }
});

module.exports = router;
