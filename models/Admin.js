const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin' },
    role: { type: String, enum: ['owner', 'admin'], default: 'admin' },
    lastLoginAt: { type: Date },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
