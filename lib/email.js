const Admin = require('../models/Admin');

const FROM_NAME = process.env.EMAIL_FROM_NAME || 'SIDITA Halal Rentals';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev';
const FROM = `${FROM_NAME} <${FROM_ADDRESS}>`;

// Sends an email via Resend's REST API. Never throws — logs and returns false on failure,
// so a broken/unset email config never breaks the actual request it's attached to.
async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email:', subject);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[email] Resend API error:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] Failed to send:', err.message);
    return false;
  }
}

async function getAllAdminEmails() {
  const admins = await Admin.find().select('email');
  return admins.map((a) => a.email);
}

function wrapper(bodyHtml) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif; max-width:560px; margin:0 auto; color:#14201D;">
    <div style="background:linear-gradient(135deg,#17915F,#0A4E36); padding:22px 26px; border-radius:12px 12px 0 0;">
      <span style="color:#fff; font-weight:800; font-size:18px; letter-spacing:-0.02em;">SIDITA Halal Rentals</span>
    </div>
    <div style="border:1px solid #E7EAE9; border-top:none; padding:26px; border-radius:0 0 12px 12px;">
      ${bodyHtml}
    </div>
    <p style="color:#93A19C; font-size:11.5px; text-align:center; margin-top:16px;">This is an automated message from your SIDITA fleet system.</p>
  </div>`;
}

async function sendNewRequestEmail(lease, vehicle) {
  const admins = await getAllAdminEmails();
  if (!admins.length) return;

  const dateRange = lease.startDate
    ? `${new Date(lease.startDate).toLocaleDateString()}${lease.endDate ? ' → ' + new Date(lease.endDate).toLocaleDateString() : ''}`
    : 'Not specified';

  const html = wrapper(`
    <h2 style="margin:0 0 4px; font-size:19px;">New ${lease.type} request</h2>
    <p style="color:#5C6B66; font-size:13.5px; margin:0 0 20px;">A customer just submitted a request on the fleet site.</p>
    <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
      <tr><td style="padding:6px 0; color:#5C6B66; width:130px;">Vehicle</td><td style="padding:6px 0; font-weight:700;">${vehicle ? vehicle.name : 'Unknown'}</td></tr>
      <tr><td style="padding:6px 0; color:#5C6B66;">Request type</td><td style="padding:6px 0; text-transform:capitalize; font-weight:700;">${lease.type}</td></tr>
      <tr><td style="padding:6px 0; color:#5C6B66;">Dates</td><td style="padding:6px 0;">${dateRange}</td></tr>
      <tr><td style="padding:12px 0 6px; color:#5C6B66; border-top:1px solid #E7EAE9;" colspan="2"><strong>Customer details</strong></td></tr>
      <tr><td style="padding:6px 0; color:#5C6B66;">Name</td><td style="padding:6px 0;">${lease.customerName}</td></tr>
      <tr><td style="padding:6px 0; color:#5C6B66;">Email</td><td style="padding:6px 0;">${lease.customerEmail}</td></tr>
      <tr><td style="padding:6px 0; color:#5C6B66;">Phone</td><td style="padding:6px 0;">${lease.customerPhone}</td></tr>
      ${lease.notes ? `<tr><td style="padding:6px 0; color:#5C6B66;">Notes</td><td style="padding:6px 0;">${lease.notes}</td></tr>` : ''}
    </table>
    <p style="margin-top:20px; font-size:13px; color:#5C6B66;">Log into the admin panel's Requests page to review and respond.</p>
  `);

  await sendEmail({ to: admins, subject: `New ${lease.type} request — ${vehicle ? vehicle.name : 'a vehicle'}`, html });
}

async function sendNewAdminCredentialsEmail(admin, plainPassword) {
  const html = wrapper(`
    <h2 style="margin:0 0 4px; font-size:19px;">Welcome to the team, ${admin.name}</h2>
    <p style="color:#5C6B66; font-size:13.5px; margin:0 0 20px;">An account has been created for you on the SIDITA admin panel.</p>
    <table style="width:100%; border-collapse:collapse; font-size:13.5px; background:#F4F5F6; border-radius:10px;">
      <tr><td style="padding:12px 16px; color:#5C6B66; width:100px;">Email</td><td style="padding:12px 16px; font-weight:700;">${admin.email}</td></tr>
      <tr><td style="padding:12px 16px; color:#5C6B66;">Password</td><td style="padding:12px 16px; font-weight:700;">${plainPassword}</td></tr>
      <tr><td style="padding:12px 16px; color:#5C6B66;">Role</td><td style="padding:12px 16px; text-transform:capitalize;">${admin.role}</td></tr>
    </table>
    <p style="margin-top:18px; font-size:13px; color:#5C6B66;">Please sign in and change this password from Settings as soon as possible.</p>
  `);
  await sendEmail({ to: admin.email, subject: 'Your SIDITA admin account', html });
}

async function sendAdminAddedNotificationEmail(newAdmin, recipientEmails) {
  if (!recipientEmails.length) return;
  const html = wrapper(`
    <h2 style="margin:0 0 4px; font-size:19px;">A new admin was added</h2>
    <p style="color:#5C6B66; font-size:13.5px;">
      <strong>${newAdmin.name}</strong> (${newAdmin.email}) was just given ${newAdmin.role === 'owner' ? 'owner' : 'admin'} access to the SIDITA admin panel.
    </p>
    <p style="margin-top:16px; font-size:13px; color:#5C6B66;">If you didn't expect this, please review the Admins page right away.</p>
  `);
  await sendEmail({ to: recipientEmails, subject: 'New admin added to SIDITA', html });
}

module.exports = {
  sendEmail,
  getAllAdminEmails,
  sendNewRequestEmail,
  sendNewAdminCredentialsEmail,
  sendAdminAddedNotificationEmail
};
