'use strict';

const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const pool      = require('../config/db');
const { requireAuth } = require('../middleware/authMiddleware');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Ensure uploads/ exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, req.user.id + '_' + Date.now() + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext     = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function safeUnlink(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
  catch (e) { console.error('[safeUnlink]', e.message); }
}

// ── POST /catch/submit
// FIX: multer is called manually via callback — NOT used as middleware.
// When used as middleware, multer errors become unhandled rejections on
// older Node versions and crash the process. The callback form catches them.
router.post('/submit', requireAuth, (req, res) => {
  upload.single('fish_image')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        const msg = uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'Image too large. Max 5 MB.'
          : 'Invalid file type. Use jpg, png, or webp.';
        return res.redirect('/dashboard?error=' + encodeURIComponent(msg));
      }

      if (!req.file) {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Please upload a photo.'));
      }

      const fish_name   = (req.body.fish_name   || '').trim();
      const size_inches = (req.body.size_inches  || '').trim();
      const weight_lbs  = (req.body.weight_lbs   || '').trim();
      const location    = (req.body.location     || '').trim();
      const description = (req.body.description  || '').trim();

      if (!fish_name || !size_inches) {
        safeUnlink(req.file.path);
        return res.redirect('/dashboard?error=' + encodeURIComponent('Fish name and size are required.'));
      }

      const size = parseFloat(size_inches);
      if (isNaN(size) || size <= 0 || size > 300) {
        safeUnlink(req.file.path);
        return res.redirect('/dashboard?error=' + encodeURIComponent('Size must be 1–300 inches.'));
      }

      await pool.query(
        `INSERT INTO catches (user_id, fish_name, size_inches, weight_lbs, location, image_path, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          fish_name,
          size,
          weight_lbs  ? parseFloat(weight_lbs) : null,
          location    || null,
          '/uploads/' + req.file.filename,
          description || null,
        ]
      );

      return res.redirect('/dashboard?success=' + encodeURIComponent('Catch submitted!'));

    } catch (err) {
      if (req.file) safeUnlink(req.file.path);
      console.error('[POST /catch/submit]', err.message);
      return res.redirect('/dashboard?error=' + encodeURIComponent('Server error. Try again.'));
    }
  });
});

// ── POST /catch/delete/:id
router.post('/delete/:id', requireAuth, async (req, res) => {
  try {
    const catchId = parseInt(req.params.id, 10);
    if (isNaN(catchId)) {
      return res.redirect('/dashboard?error=' + encodeURIComponent('Invalid catch ID.'));
    }

    const result = await pool.query(
      'SELECT * FROM catches WHERE id = $1 AND user_id = $2',
      [catchId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.redirect('/dashboard?error=' + encodeURIComponent('Catch not found.'));
    }

    safeUnlink(path.join(__dirname, '..', result.rows[0].image_path));
    await pool.query('DELETE FROM catches WHERE id = $1', [catchId]);

    return res.redirect('/dashboard?success=' + encodeURIComponent('Catch deleted.'));

  } catch (err) {
    console.error('[POST /catch/delete]', err.message);
    return res.redirect('/dashboard?error=' + encodeURIComponent('Server error. Try again.'));
  }
});

module.exports = router;
