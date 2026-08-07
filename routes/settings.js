const express = require('express');
const Settings = require('../models/Settings');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  return settings;
}

// GET /api/settings - public (the customer site needs currency + category lists too)
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings', details: err.message });
  }
});

// PUT /api/settings - admin only
router.put('/', requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { vehicleCategories, vehicleBrands, fuelTypes, transmissionTypes, currency, guestModeEnabled } = req.body;

    if (Array.isArray(vehicleCategories)) settings.vehicleCategories = cleanList(vehicleCategories);
    if (Array.isArray(vehicleBrands)) settings.vehicleBrands = cleanList(vehicleBrands);
    if (Array.isArray(fuelTypes)) settings.fuelTypes = cleanList(fuelTypes);
    if (Array.isArray(transmissionTypes)) settings.transmissionTypes = cleanList(transmissionTypes);
    if (currency && typeof currency === 'object') {
      if (currency.code) settings.currency.code = String(currency.code).trim();
      if (currency.symbol) settings.currency.symbol = String(currency.symbol).trim();
    }
    if (typeof guestModeEnabled === 'boolean') settings.guestModeEnabled = guestModeEnabled;

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update settings', details: err.message });
  }
});

function cleanList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const v = String(raw || '').trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
}

module.exports = router;
