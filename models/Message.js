const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    sender: { type: String, enum: ['admin', 'customer'], required: true },
    senderName: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    readByAdmin: { type: Boolean, default: false },
    readByCustomer: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);
