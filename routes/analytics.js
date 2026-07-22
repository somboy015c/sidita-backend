const express = require('express');
const Vehicle = require('../models/Vehicle');
const Lease = require('../models/Lease');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/summary - admin only
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments();
    const byStatus = await Vehicle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalRequests = await Lease.countDocuments();
    const byRequestStatus = await Lease.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byType = await Lease.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Requests per month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const monthly = await Lease.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const revenueAgg = await Lease.aggregate([
      { $match: { status: { $in: ['approved', 'active', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);

    res.json({
      totalVehicles,
      vehiclesByStatus: byStatus,
      totalRequests,
      requestsByStatus: byRequestStatus,
      requestsByType: byType,
      requestsPerMonth: monthly,
      estimatedRevenue: revenueAgg[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute analytics', details: err.message });
  }
});

module.exports = router;
