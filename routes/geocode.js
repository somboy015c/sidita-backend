const express = require('express');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/geocode/locate-ip - admin only. body: { ip }
// Uses ip-api.com (free, no key) to estimate a location from an IP address.
// NOTE: this is an ISP-level estimate, not true GPS — accuracy is typically
// city-level at best, and can be off by many kilometers, especially for
// mobile/carrier IPs. It's a helpful starting point, not exact tracking.
router.post('/locate-ip', requireAdmin, async (req, res) => {
  try {
    const ip = (req.body.ip || '').trim();
    if (!ip) return res.status(400).json({ error: 'No IP address provided for this vehicle\u2019s tracker yet' });

    const ghRes = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,lat,lon,query`);
    const data = await ghRes.json();

    if (data.status !== 'success') {
      return res.status(422).json({ error: data.message || 'Could not locate that IP address' });
    }

    const label = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
    res.json({ lat: data.lat, lng: data.lon, label, approximate: true });
  } catch (err) {
    res.status(500).json({ error: 'Location lookup failed', details: err.message });
  }
});

// GET /api/geocode/reverse?lat=&lng= - admin only.
// Uses OpenStreetMap's free Nominatim service to turn coordinates into a place name.
router.get('/reverse', requireAdmin, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14`;
    const ghRes = await fetch(url, { headers: { 'User-Agent': 'sidita-backend/1.0' } });
    const data = await ghRes.json();

    const label = data.display_name || `${lat}, ${lng}`;
    res.json({ label });
  } catch (err) {
    res.status(500).json({ error: 'Reverse geocoding failed', details: err.message });
  }
});

module.exports = router;
