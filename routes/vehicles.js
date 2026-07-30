const express = require('express');
const Vehicle = require('../models/Vehicle');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/vehicles - public, supports ?status=&category=&search=
router.get('/', async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') }
      ];
    }
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: err.message });
  }
});

// GET /api/vehicles/:id - public
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicle', details: err.message });
  }
});

// POST /api/vehicles - admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create vehicle', details: err.message });
  }
});

// PUT /api/vehicles/:id - admin only
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update vehicle', details: err.message });
  }
});

// DELETE /api/vehicles/:id - admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle', details: err.message });
  }
});

// PATCH /api/vehicles/:id/tracking - admin only, update GPS ping / location
router.patch('/:id/tracking', requireAdmin, async (req, res) => {
  try {
    const { deviceIp, deviceId, lat, lng, locationLabel } = req.body;
    const update = {
      'tracking.deviceIp': deviceIp,
      'tracking.deviceId': deviceId,
      'tracking.lastKnownLocation': { lat, lng },
      'tracking.lastPingAt': new Date()
    };
    if (locationLabel !== undefined) update['tracking.locationLabel'] = locationLabel;
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update tracking info', details: err.message });
  }
});

module.exports = router;
