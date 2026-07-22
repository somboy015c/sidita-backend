require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = (process.env.ADMIN_EMAIL || 'admin@sidita-rentals.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123';

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log('Admin already exists for', email, '- skipping.');
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({ email, passwordHash, name: 'SIDITA Admin' });
    console.log('Created admin account:');
    console.log('  Email:   ', email);
    console.log('  Password:', password);
    console.log('Log in with these at your admin panel, then change the password.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
