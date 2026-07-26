require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const leaseRoutes = require('./routes/leases');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admins');
const settingsRoutes = require('./routes/settings');

const app = express();

// ----- CORS -----
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS: ' + origin));
      }
    }
  })
);

app.use(express.json());

// ----- Routes -----
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'SIDITA Halal Rentals API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ----- Start server -----
const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`SIDITA API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
