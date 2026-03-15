'use strict';

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Protect routes — redirect to login if no valid JWT cookie
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/auth/login');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
}

// Redirect already-logged-in users away from login/register
function redirectIfAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return next();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.redirect('/dashboard');
  } catch (err) {
    res.clearCookie('token');
    return next();
  }
}

module.exports = { requireAuth, redirectIfAuth };
