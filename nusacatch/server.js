'use strict';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

const express      = require('express');
const path         = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const catchRoutes     = require('./routes/catch');
const dashboardRoutes = require('./routes/dashboard');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── View engine 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Body parsers — size limits prevent memory spikes on low-RAM VMs 
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ── Static files 
// public/css/style.css → /css/style.css
// public/js/main.js    → /js/main.js
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes 
app.use('/auth',  authRoutes);
app.use('/catch', catchRoutes);
app.use('/',      dashboardRoutes);

// ── 404 
app.use((req, res) => {
  res.status(404).render('404');
});

// ── Express error middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[Express error]', err.message);
  res.status(500).send('Something went wrong. <a href="/">Go back</a>');
});

// ── Start 
app.listen(PORT, '0.0.0.0', () => {
  console.log('NusaCatch running -> http://localhost:' + PORT);
});
