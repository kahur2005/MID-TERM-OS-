'use strict';

const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const pool      = require('../config/db');
const { redirectIfAuth } = require('../middleware/authMiddleware');
require('dotenv').config();

const BCRYPT_ROUNDS = 8;

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// ── GET /auth/login 
router.get('/login', redirectIfAuth, (req, res) => {
  return res.render('login', { error: null });
});

// ── POST /auth/login 
router.post('/login', redirectIfAuth, async (req, res) => {
  try {
    const email    = (req.body.email    || '').trim().toLowerCase();
    const password = (req.body.password || '');

    if (!email || !password) {
      return res.render('login', { error: 'Please fill in all fields.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password.' });
    }

    setTokenCookie(res, signToken(user));
    return res.redirect('/dashboard');

  } catch (err) {
    console.error('[POST /auth/login]', err.message);
    return res.render('login', { error: 'Server error. Please try again.' });
  }
});

// ── GET /auth/register 
router.get('/register', redirectIfAuth, (req, res) => {
  return res.render('register', { error: null });
});

// ── POST /auth/register 
router.post('/register', redirectIfAuth, async (req, res) => {
  // Everything is inside ONE try/catch.
  // Original bug: validation was outside try/catch — any throw became
  // an unhandled rejection and crashed the process on Ubuntu 20.
  try {
    const username         = (req.body.username         || '').trim();
    const email            = (req.body.email            || '').trim().toLowerCase();
    const password         = (req.body.password         || '');
    const confirm_password = (req.body.confirm_password || '');

    // Validate first — before any DB/bcrypt work
    if (!username || !email || !password || !confirm_password) {
      return res.render('register', { error: 'Please fill in all fields.' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.render('register', { error: 'Username must be 3–50 characters.' });
    }
    if (password.length < 6) {
      return res.render('register', { error: 'Password must be at least 6 characters.' });
    }
    if (password !== confirm_password) {
      return res.render('register', { error: 'Passwords do not match.' });
    }

    // Check for existing user
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.render('register', { error: 'Email or username already taken.' });
    }

    // Hash password — ONE call, cost 8 (not genSalt(10) + hash separately)
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, password_hash]
    );

    setTokenCookie(res, signToken(result.rows[0]));
    return res.redirect('/dashboard');

  } catch (err) {
    console.error('[POST /auth/register]', err.message);
    return res.render('register', { error: 'Server error. Please try again.' });
  }
});

// ── GET /auth/logout 
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.redirect('/auth/login');
});

module.exports = router;
