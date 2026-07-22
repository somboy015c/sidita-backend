const mongoose = require('mongoose');

const LeaseSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: {
      type: String,
      enum: ['rental', 'lease', 'purchase'],
      required: true
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled'],
      default: 'pending'
    },
    totalValue: { type: Number, default: 0 } // filled in/estimated by admin
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lease', LeaseSchema);
