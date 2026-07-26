const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(payload.id);
    if (!admin) {
      return res.status(401).json({ error: 'Session expired — please sign in again.' });
    }
    if ((admin.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Session expired — please sign in again.' });
    }

    req.admin = { id: admin._id.toString(), email: admin.email, name: admin.name, role: admin.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin };
