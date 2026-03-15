'use strict';

const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');
const { requireAuth, redirectIfAuth } = require('../middleware/authMiddleware');

// GET  redirect to login
router.get('/', redirectIfAuth, (req, res) => res.redirect('/auth/login'));

// GET /dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [myCatches, leaderboard, personalBest] = await Promise.all([
      pool.query(
        'SELECT * FROM catches WHERE user_id = $1 ORDER BY submitted_at DESC',
        [req.user.id]
      ),
      pool.query(
        `SELECT u.username, c.fish_name, c.size_inches, c.weight_lbs,
                c.location, c.image_path, c.submitted_at,
                RANK() OVER (ORDER BY c.size_inches DESC) AS rank
         FROM catches c JOIN users u ON c.user_id = u.id
         ORDER BY c.size_inches DESC LIMIT 10`
      ),
      pool.query(
        'SELECT * FROM catches WHERE user_id = $1 ORDER BY size_inches DESC LIMIT 1',
        [req.user.id]
      ),
    ]);

    return res.render('dashboard', {
      user:        req.user,
      myCatches:   myCatches.rows,
      leaderboard: leaderboard.rows,
      personalBest: personalBest.rows[0] || null,
      success: req.query.success ? decodeURIComponent(req.query.success) : null,
      error:   req.query.error   ? decodeURIComponent(req.query.error)   : null,
    });
  } catch (err) {
    console.error('[GET /dashboard]', err.message);
    return res.status(500).send('Could not load dashboard. <a href="/">Retry</a>');
  }
});

// GET /leaderboard
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.username, c.fish_name, c.size_inches, c.weight_lbs,
              c.location, c.image_path, c.submitted_at,
              RANK() OVER (ORDER BY c.size_inches DESC) AS rank
       FROM catches c JOIN users u ON c.user_id = u.id
       ORDER BY c.size_inches DESC`
    );
    return res.render('leaderboard', { user: req.user, leaderboard: result.rows });
  } catch (err) {
    console.error('[GET /leaderboard]', err.message);
    return res.status(500).send('Could not load leaderboard. <a href="/">Retry</a>');
  }
});

module.exports = router;
