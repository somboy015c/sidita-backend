const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// POST /api/uploads/images - admin only. Accepts up to 5 images (field name "images").
// Commits each one to a GitHub repo via the Contents API and returns the raw URLs.
router.post('/images', requireAdmin, upload.array('images', 5), async (req, res) => {
  const { GITHUB_TOKEN, GITHUB_IMAGES_REPO, GITHUB_IMAGES_BRANCH } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_IMAGES_REPO) {
    return res.status(500).json({
      error: 'Image hosting isn\'t configured yet. Set GITHUB_TOKEN and GITHUB_IMAGES_REPO on the server — see the README.'
    });
  }

  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'No images were uploaded' });
  }

  const branch = GITHUB_IMAGES_BRANCH || 'main';
  const urls = [];

  try {
    for (const file of req.files) {
      const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const safeName = crypto.randomBytes(8).toString('hex');
      const path = `vehicles/${Date.now()}-${safeName}.${ext}`;

      const apiUrl = `https://api.github.com/repos/${GITHUB_IMAGES_REPO}/contents/${path}`;
      const ghRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'sidita-backend'
        },
        body: JSON.stringify({
          message: `Upload vehicle image ${path}`,
          content: file.buffer.toString('base64'),
          branch
        })
      });

      if (!ghRes.ok) {
        const errBody = await ghRes.json().catch(() => ({}));
        throw new Error(errBody.message || `GitHub upload failed (${ghRes.status})`);
      }

      const data = await ghRes.json();
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_IMAGES_REPO}/${branch}/${path}`;
      urls.push(rawUrl);
    }

    res.status(201).json({ urls });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload one or more images', details: err.message, urls });
  }
});

module.exports = router;
