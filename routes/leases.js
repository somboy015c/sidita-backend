const express = require('express');
const Lease = require('../models/Lease');
const Vehicle = require('../models/Vehicle');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/leases - public: customer submits a lease/rental/purchase request
router.post('/', async (req, res) => {
  try {
    const { vehicle, type, customerName, customerEmail, customerPhone, startDate, endDate, notes } = req.body;

    if (!vehicle || !type || !customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const vehicleDoc = await Vehicle.findById(vehicle);
    if (!vehicleDoc) return res.status(404).json({ error: 'Vehicle not found' });

    const lease = await Lease.create({
      vehicle,
      type,
      customerName,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
      notes
    });

    res.status(201).json(lease);
  } catch (err) {
    res.status(400).json({ error: 'Failed to submit request', details: err.message });
  }
});

// GET /api/leases - admin only, list all requests
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leases = await Lease.find(filter).populate('vehicle').sort({ createdAt: -1 });
    res.json(leases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
});

// PUT /api/leases/:id - admin only, update status/details
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const lease = await Lease.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vehicle');
    if (!lease) return res.status(404).json({ error: 'Request not found' });

    // Keep vehicle status roughly in sync with lease status
    if (['approved', 'active'].includes(lease.status)) {
      const newStatus = lease.type === 'lease' ? 'leased' : lease.type === 'rental' ? 'rented' : undefined;
      if (newStatus) await Vehicle.findByIdAndUpdate(lease.vehicle._id, { status: newStatus });
    }
    if (['completed', 'cancelled'].includes(lease.status)) {
      await Vehicle.findByIdAndUpdate(lease.vehicle._id, { status: 'available' });
    }

    res.json(lease);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update request', details: err.message });
  }
});

// DELETE /api/leases/:id - admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const lease = await Lease.findByIdAndDelete(req.params.id);
    if (!lease) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete request', details: err.message });
  }
});

module.exports = router;
