const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Land Rover Defender"
    brand: { type: String, required: true, trim: true },
    modelYear: { type: Number, required: true },
    category: { type: String, default: 'Sedan', trim: true },
    plateNumber: { type: String, trim: true },
    vin: { type: String, trim: true },

    // Availability & pricing
    status: {
      type: String,
      enum: ['available', 'leased', 'rented', 'maintenance'],
      default: 'available'
    },
    dailyRentalRate: { type: Number, default: 0 },
    monthlyLeaseRate: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },

    // Specs
    transmission: { type: String, default: 'Automatic', trim: true },
    fuelType: { type: String, default: 'Petrol', trim: true },
    seats: { type: Number, default: 5 },
    mileage: { type: Number, default: 0 },
    condition: {
      type: String,
      enum: ['Brand New', 'Foreign Used', 'Nigerian Used'],
      default: 'Nigerian Used'
    },
    listingStatus: {
      type: String,
      enum: ['For Sale', 'Not For Sale'],
      default: 'Not For Sale'
    },

    // GPS / telematics tracking device attached to the vehicle
    tracking: {
      deviceId: { type: String, trim: true },
      deviceIp: { type: String, trim: true }, // IP address of the tracker/telematics unit
      lastKnownLocation: {
        lat: { type: Number },
        lng: { type: Number }
      },
      lastPingAt: { type: Date }
    },

    description: { type: String, trim: true },
    images: [{ type: String }], // image URLs

    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', VehicleSchema);
