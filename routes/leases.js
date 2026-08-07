const express = require('express');
const Lease = require('../models/Lease');
const Vehicle = require('../models/Vehicle');
const Settings = require('../models/Settings');
const { requireAdmin } = require('../middleware/auth');
const { optionalCustomer } = require('../middleware/customerAuth');
const { sendNewRequestEmail } = require('../lib/email');
const { calculateEstimatedTotal } = require('../lib/pricing');

const router = express.Router();

// POST /api/leases/estimate - public. Same calculation used when the request is actually
// created, so the number shown to the customer while they're filling the form always
// matches what gets recorded. Body: { vehicle, type, startDate, endDate }
router.post('/estimate', async (req, res) => {
  try {
    const { vehicle, type, startDate, endDate } = req.body;
    if (!vehicle || !type) return res.status(400).json({ error: 'vehicle and type are required' });

    const vehicleDoc = await Vehicle.findById(vehicle);
    if (!vehicleDoc) return res.status(404).json({ error: 'Vehicle not found' });

    const estimate = calculateEstimatedTotal({
      type,
      startDate,
      endDate,
      dailyRentalRate: vehicleDoc.dailyRentalRate,
      monthlyLeaseRate: vehicleDoc.monthlyLeaseRate,
      purchasePrice: vehicleDoc.purchasePrice
    });

    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate estimate', details: err.message });
  }
});

// POST /api/leases - public (or customer-authenticated, depending on guest mode):
// customer submits a lease/rental/purchase request
router.post('/', optionalCustomer, async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'global' });
    const guestModeEnabled = settings ? settings.guestModeEnabled !== false : true;

    if (!guestModeEnabled && !req.customer) {
      return res.status(401).json({ error: 'Please sign in or create an account to submit a request.' });
    }

    const { vehicle, type, startDate, endDate, notes } = req.body;
    // When signed in, always use the account's own details — never trust body-supplied
    // name/email/phone for a logged-in customer. Guests (when allowed) supply their own.
    const customerName = req.customer ? req.customer.name : req.body.customerName;
    const customerEmail = req.customer ? req.customer.email : req.body.customerEmail;
    const customerPhone = req.customer ? req.customer.phone : req.body.customerPhone;

    if (!vehicle || !type || !customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const vehicleDoc = await Vehicle.findById(vehicle);
    if (!vehicleDoc) return res.status(404).json({ error: 'Vehicle not found' });

    // The backend recalculates the total itself rather than trusting a client-supplied
    // number, using the exact same formula the /estimate endpoint already showed the customer.
    const { total: totalValue } = calculateEstimatedTotal({
      type,
      startDate,
      endDate,
      dailyRentalRate: vehicleDoc.dailyRentalRate,
      monthlyLeaseRate: vehicleDoc.monthlyLeaseRate,
      purchasePrice: vehicleDoc.purchasePrice
    });

    const lease = await Lease.create({
      vehicle,
      customer: req.customer ? req.customer.id : undefined,
      type,
      customerName,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
      notes,
      totalValue
    });

    // Fire-and-forget: never let an email hiccup break the customer's request.
    sendNewRequestEmail(lease, vehicleDoc).catch((err) => console.error('[email] new request notify failed:', err.message));

    res.status(201).json(lease);
  } catch (err) {
    res.status(400).json({ error: 'Failed to submit request', details: err.message });
  }
});

// GET /api/leases/mine - customer only, their own request history
router.get('/mine', require('../middleware/customerAuth').requireCustomer, async (req, res) => {
  try {
    const leases = await Lease.find({ customer: req.customer.id }).populate('vehicle').sort({ createdAt: -1 });
    res.json(leases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your requests', details: err.message });
  }
});

// GET /api/leases - admin only, list all requests
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leases = await Lease.find(filter).populate('vehicle').populate('customer', 'name email').sort({ createdAt: -1 });
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
