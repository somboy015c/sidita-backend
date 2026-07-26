const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    // A fixed key so there's always exactly one settings document.
    key: { type: String, default: 'global', unique: true },

    vehicleCategories: {
      type: [String],
      default: ['SUV', 'Sedan', 'Truck', 'Van', 'Luxury', 'Compact']
    },
    vehicleBrands: {
      type: [String],
      default: [
        'Toyota', 'Lexus', 'Mercedes-Benz', 'BMW', 'Land Rover', 'Range Rover',
        'Honda', 'Hyundai', 'Kia', 'Nissan', 'Ford', 'Volkswagen', 'Peugeot',
        'Mazda', 'Chevrolet', 'Jeep', 'Infiniti', 'Acura'
      ]
    },
    fuelTypes: {
      type: [String],
      default: ['Petrol', 'Diesel', 'Hybrid', 'Electric']
    },
    transmissionTypes: {
      type: [String],
      default: ['Automatic', 'Manual']
    },

    currency: {
      code: { type: String, default: 'NGN' },
      symbol: { type: String, default: '₦' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', SettingsSchema);
