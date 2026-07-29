const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admins - list all admin accounts
router.get('/', requireAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admins', details: err.message });
  }
});

// POST /api/admins - create a new admin account
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'An admin with that email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name: name || 'Admin',
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role === 'owner' ? 'owner' : 'admin'
    });

    const { passwordHash: _omit, ...safeAdmin } = admin.toObject();
    res.status(201).json(safeAdmin);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create admin', details: err.message });
  }
});

// PUT /api/admins/:id/reset-password - reset ANOTHER admin's password (e.g. they're locked out).
// Generates a temporary password unless one is supplied, and forces that admin to log out everywhere.
router.put('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ error: 'Use "Change Password" in Settings to update your own password.' });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    let { newPassword } = req.body;
    let generated = false;
    if (!newPassword) {
      newPassword = crypto.randomBytes(6).toString('base64url'); // ~8 readable chars
      generated = true;
    } else if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await Admin.findByIdAndUpdate(admin._id, {
      $set: { passwordHash: admin.passwordHash },
      $inc: { tokenVersion: 1 }
    }); // atomic update — forces logout everywhere for that admin

    res.json({
      message: 'Password reset. Share the new password with them securely — it will not be shown again.',
      temporaryPassword: generated ? newPassword : undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password', details: err.message });
  }
});

// DELETE /api/admins/:id - remove an admin account
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account while logged in' });
    }

    const totalAdmins = await Admin.countDocuments();
    if (totalAdmins <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining admin account' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    res.json({ message: 'Admin removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete admin', details: err.message });
  }
});

module.exports = router;
