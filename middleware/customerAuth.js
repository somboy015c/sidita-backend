const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

async function verifyCustomerToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.scope !== 'customer') return null; // reject admin tokens etc.

  const customer = await Customer.findById(payload.id);
  if (!customer) return null;
  if ((customer.tokenVersion || 0) !== (payload.tokenVersion || 0)) return null;

  return { id: customer._id.toString(), name: customer.name, email: customer.email, phone: customer.phone };
}

// Hard requirement - route fails with 401 if there's no valid customer token.
async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });

  try {
    const customer = await verifyCustomerToken(token);
    if (!customer) return res.status(401).json({ error: 'Session expired — please sign in again.' });
    req.customer = customer;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session — please sign in again.' });
  }
}

// Soft - attaches req.customer if a valid token is present, but never blocks the request.
// Used on the public "create request" endpoint so a logged-in customer gets linked to their
// request even when guest mode is on and login isn't required.
async function optionalCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const customer = await verifyCustomerToken(token);
    if (customer) req.customer = customer;
  } catch (err) {
    // an invalid/expired token on this soft path just means "treat as guest" — no error surfaced
  }
  next();
}

module.exports = { requireCustomer, optionalCustomer };
