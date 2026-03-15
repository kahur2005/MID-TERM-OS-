# 🐟 NusaCatch

> A fishing social competition web app where anglers compete for the biggest catch on the leaderboard.

![Node.js](https://img.shields.io/badge/Node.js-18_LTS-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12-4169E1?logo=postgresql&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-1.18-009639?logo=nginx&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
  - [1. Clone or Upload the Project](#1-clone-or-upload-the-project)
  - [2. Install System Dependencies](#2-install-system-dependencies)
  - [3. Install Node.js 18](#3-install-nodejs-18)
  - [4. Set Up PostgreSQL](#4-set-up-postgresql)
  - [5. Configure Environment Variables](#5-configure-environment-variables)
  - [6. Install Node Packages](#6-install-node-packages)
  - [7. Run the Database Schema](#7-run-the-database-schema)
  - [8. Configure Nginx](#8-configure-nginx)
  - [9. Run with PM2](#9-run-with-pm2)
- [Running in Development Mode](#-running-in-development-mode)
- [Environment Variables Reference](#-environment-variables-reference)
- [API Routes](#-api-routes)
- [File Permissions & Security](#-file-permissions--security)
- [Troubleshooting](#-troubleshooting)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## 📖 About

NusaCatch is a full-stack web application built as an Operating Systems midterm project. It demonstrates a complete Linux server deployment including a Node.js backend, PostgreSQL database, Nginx reverse proxy, and PM2 process management. Users can register, log in, submit fish catches with photos, and compete on a live leaderboard ranked by catch size.

---

## ✨ Features

- 🔐 **User authentication** — register and login with JWT tokens stored in HTTP-only cookies
- 🐠 **Submit catches** — upload a fish photo with name, size (inches), weight, and location
- 🏆 **Live leaderboard** — all catches ranked by size using a PostgreSQL `RANK()` window function
- 🥇 **Podium view** — top 3 catches displayed on a visual podium on the leaderboard page
- 🗑️ **Delete catches** — users can remove their own catches (image file is also deleted from disk)
- 📱 **Responsive design** — works on desktop and mobile browsers

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 18 LTS | Server-side JavaScript execution |
| Framework | Express.js 4 | HTTP routing and middleware |
| Database | PostgreSQL 12 | Storing users and catches |
| DB Client | node-postgres (pg) | Connecting Node.js to PostgreSQL |
| Auth | jsonwebtoken + bcryptjs | JWT tokens and password hashing |
| Uploads | Multer | Handling multipart/form-data file uploads |
| Templates | EJS | Server-side HTML rendering |
| Config | dotenv | Loading `.env` variables at runtime |
| Web Server | Nginx 1.18 | Reverse proxy on port 80 |
| Process Mgr | PM2 | Keeping Node.js alive across reboots |
| OS | Ubuntu 20.04 LTS | Server operating system |

---

## 📁 Project Structure

```
nusacatch/
├── server.js                   # Entry point — starts Express, loads routes
├── package.json                # npm dependency definitions
├── .env                        # Secret config (NOT committed to Git)
├── .gitignore                  # Excludes .env, node_modules, uploads
│
├── config/
│   ├── db.js                   # PostgreSQL connection pool
│   └── schema.sql              # SQL to create users and catches tables
│
├── routes/
│   ├── auth.js                 # POST /auth/login, /register | GET /auth/logout
│   ├── catch.js                # POST /catch/submit, /catch/delete/:id
│   └── dashboard.js            # GET /dashboard, /leaderboard
│
├── middleware/
│   └── authMiddleware.js       # JWT verification — protects private routes
│
├── views/                      # EJS HTML templates
│   ├── partials/
│   │   ├── header.ejs          # <head> tag, CSS/font links
│   │   ├── navbar.ejs          # Navigation bar
│   │   └── footer.ejs          # Footer + JS script tags
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── leaderboard.ejs
│   └── 404.ejs
│
├── public/                     # Static files served directly to browsers
│   ├── css/
│   │   └── style.css           # Main stylesheet
│   └── js/
│       └── main.js             # Client-side JavaScript
│
├── uploads/                    # Fish photos saved here (auto-created)
└── nusacatch.nginx.conf        # Nginx reverse proxy configuration
```

---

## ✅ Prerequisites

Before starting, make sure you have:

- A **Linux server or VM** running Ubuntu 20.04 LTS (or Kali Linux / any Debian-based distro)
- **SSH access** to the server
- A user account with **sudo privileges**
- At least **512 MB RAM** (1 GB recommended)

---

## 🚀 Installation

### 1. Clone or Upload the Project

**Option A — SCP from your local machine:**

```bash
# Run this on your LOCAL machine, not the server
scp -r ./nusacatch your_username@YOUR_SERVER_IP:~/nusacatch
```

**Option B — Create the folder structure manually on the server:**

```bash
mkdir -p ~/nusacatch/{routes,middleware,config,views/partials,public/css,public/js,uploads}
```

Then create each file with `nano` and paste the contents from the provided source files.

---

### 2. Install System Dependencies

SSH into your server and run:

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL and Nginx
sudo apt install -y postgresql postgresql-contrib nginx

# Start and enable both services
sudo systemctl start postgresql nginx
sudo systemctl enable postgresql nginx
```

---

### 3. Install Node.js 18

> ⚠️ Ubuntu 20 ships with Node.js 10 by default. Node 10 is too old for this project. You **must** install Node 18 via NodeSource.

```bash
# Download and run the NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js (this also installs npm)
sudo apt install -y nodejs

# Verify — must show v18.x.x or higher
node -v
npm -v

# Install PM2 globally
sudo npm install -g pm2
```

**If the NodeSource script gives a "distro not supported" error (common on Kali Linux), use this fallback:**

```bash
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] \
  https://deb.nodesource.com/node_18.x nodistro main" | \
  sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt update && sudo apt install -y nodejs
```

---

### 4. Set Up PostgreSQL

```bash
# Switch to the postgres system user
sudo -i -u postgres

# Open the PostgreSQL interactive shell
psql
```

Inside `psql`, run these four commands exactly:

```sql
-- Create the application database
CREATE DATABASE nusacatch;

-- Create a dedicated database user
-- Replace 'your_strong_password' with a real password — save it for Step 5
CREATE USER nusauser WITH PASSWORD 'your_strong_password';

-- Grant the user full access to the database
GRANT ALL PRIVILEGES ON DATABASE nusacatch TO nusauser;

-- Exit psql
\q
```

```bash
# Exit the postgres system user and return to your normal user
exit
```

---

### 5. Configure Environment Variables

```bash
nano ~/nusacatch/.env
```

Fill in your values:

```env
PORT=3000
DB_USER=nusauser
DB_HOST=localhost
DB_NAME=nusacatch
DB_PASSWORD=your_strong_password    # the password you set in Step 4
DB_PORT=5432
JWT_SECRET=pick_a_long_random_string_at_least_32_characters_long
```

> ⚠️ Never commit `.env` to Git. It is already listed in `.gitignore`.

---

### 6. Install Node Packages

```bash
cd ~/nusacatch
npm install
```

This downloads all dependencies listed in `package.json` into the `node_modules/` folder. Expected output ends with `added X packages`.

---

### 7. Run the Database Schema

```bash
# Still inside ~/nusacatch/
psql -U nusauser -h localhost -d nusacatch -f config/schema.sql
# Enter your DB password when prompted
```

Expected output:

```
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

> ✅ If you see errors about tables already existing, that is fine — the SQL uses `IF NOT EXISTS`.

---

### 8. Configure Nginx

**Create the Nginx site configuration:**

```bash
sudo nano /etc/nginx/sites-available/nusacatch
```

**Paste this block** — replace `YOUR_SERVER_IP_OR_DOMAIN` with your actual IP address:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP_OR_DOMAIN;

    # Must be larger than multer's 5 MB limit to avoid 413 errors
    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade     $http_upgrade;
        proxy_set_header   Connection  'upgrade';
        proxy_set_header   Host        $host;
        proxy_set_header   X-Real-IP   $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site and reload Nginx:**

```bash
# Create a symlink to enable the site
sudo ln -s /etc/nginx/sites-available/nusacatch /etc/nginx/sites-enabled/

# Test for syntax errors
sudo nginx -t
# Expected: syntax is ok / test is successful

# Apply the new configuration
sudo systemctl reload nginx
```

---

### 9. Run with PM2

```bash
cd ~/nusacatch

# Start the application
pm2 start server.js --name nusacatch

# Save the process list so PM2 restores it after reboot
pm2 save

# Generate the startup command and run it
pm2 startup
# PM2 will print a sudo command — copy it and run it
# Then run pm2 save again

# Verify the app is running
pm2 status
# Should show: nusacatch | online
```

**Open your browser and visit:**

```
http://YOUR_SERVER_IP
```

You should see the NusaCatch login page. 🎣

---

## 💻 Running in Development Mode

For local development on your own machine (no Nginx or PM2 needed):

```bash
cd nusacatch

# Install dependencies including nodemon
npm install

# Start with nodemon — auto-restarts when you save files
npm run dev

# Visit: http://localhost:3000
```

---

## 🔧 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port the Express server listens on | `3000` |
| `DB_USER` | PostgreSQL username | `nusauser` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_NAME` | PostgreSQL database name | `nusacatch` |
| `DB_PASSWORD` | PostgreSQL password |  |
| `DB_PORT` | PostgreSQL port | `5432` |
| `JWT_SECRET` | Secret key used to sign JWT tokens — must be long and random |  |

---

## 🗺 API Routes

### Authentication

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `GET` | `/auth/login` | Render login page | No |
| `POST` | `/auth/login` | Submit login form | No |
| `GET` | `/auth/register` | Render register page | No |
| `POST` | `/auth/register` | Submit registration form | No |
| `GET` | `/auth/logout` | Clear session cookie and redirect | No |

### Dashboard & Leaderboard

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `GET` | `/dashboard` | Main dashboard — submit form, top 10, my catches | ✅ |
| `GET` | `/leaderboard` | Full leaderboard with podium | ✅ |

### Catches

| Method | Route | Description | Auth Required |
|--------|-------|-------------|:---:|
| `POST` | `/catch/submit` | Submit a new fish catch with photo | ✅ |
| `POST` | `/catch/delete/:id` | Delete a catch (owner only) | ✅ |

---

## 🔐 File Permissions & Security

After deploying, apply correct Linux file permissions:

```bash
# Set ownership to the service account
sudo chown -R nusacatch:nusacatch ~/nusacatch/

# Source files: owner read/write, group read, others nothing
find ~/nusacatch -type f -exec chmod 640 {} \;
find ~/nusacatch -type d -exec chmod 750 {} \;

# .env: owner-only read — most sensitive file
chmod 600 ~/nusacatch/.env

# Public assets must be world-readable (browsers download them)
chmod -R 644 ~/nusacatch/public/
chmod 755 ~/nusacatch/public/ ~/nusacatch/public/css/ ~/nusacatch/public/js/

# uploads/ needs write permission for saving fish photos
chmod 770 ~/nusacatch/uploads/
```

**Key security features implemented:**

- 🔑 Passwords hashed with **bcrypt** (cost factor 8) — never stored as plaintext
- 🎫 **JWT tokens** stored in HTTP-only cookies — inaccessible to JavaScript (blocks XSS theft)
- 🛡️ **Nginx reverse proxy** — Node.js only listens on `127.0.0.1:3000`, never exposed directly
- 💉 **Parameterised SQL queries** — SQL injection is structurally impossible
- 🔒 **`.env` at chmod 600** — only the owner can read DB credentials and JWT secret
- ⚡ **Process crash guards** — `process.on('uncaughtException')` keeps server alive on errors
- 👤 **Dedicated service account** — app runs as `nusacatch` user, never root

---

## 🛠 Troubleshooting

### pm2 status shows "errored"

```bash
# See what went wrong
pm2 logs nusacatch --lines 30
```

Common causes:

| Error message | Fix |
|---------------|-----|
| `Cannot find module 'express'` | Run `npm install` inside `~/nusacatch/` |
| `password authentication failed` | Check `DB_PASSWORD` in `.env` matches psql |
| `relation "users" does not exist` | Run `psql -U nusauser -h localhost -d nusacatch -f config/schema.sql` |
| `ENOENT: no such file or directory` | A view file is missing — check `views/` folder |

### 502 Bad Gateway in browser

Nginx is running but Express is down.

```bash
pm2 status                              # check if nusacatch is online
pm2 start server.js --name nusacatch   # start it if stopped
```

### 413 Request Entity Too Large

Nginx is rejecting the upload before it reaches Express.

```bash
# Make sure your nginx config has:
# client_max_body_size 10M;
sudo nginx -t && sudo systemctl reload nginx
```

### Photos upload but don't display

```bash
ls -la ~/nusacatch/uploads/
# If missing or wrong permissions:
mkdir -p ~/nusacatch/uploads
chmod 770 ~/nusacatch/uploads/
```

### Server crashes on registration

This was the original bug — caused by unhandled Promise rejections in Node 18. Make sure you are using the fixed versions of `routes/auth.js`, `routes/catch.js`, and `server.js` which include:

- `bcrypt.hash(password, 8)` — single call, cost factor 8
- All route code inside `try/catch` blocks
- Multer using callback form: `upload.single()(req, res, async (err) => {...})`
- `process.on('uncaughtException')` at the top of `server.js`

### After any code change

```bash
pm2 restart nusacatch
```

Node.js does not hot-reload. All code changes require a restart.

---

## 📸 Screenshots

| Page | Description |
|------|-------------|
| `/auth/login` | Login page with ocean theme |
| `/auth/register` | Registration form |
| `/dashboard` | Submit catch form + Top 10 preview + My Catches grid |
| `/leaderboard` | Full leaderboard with 🥇🥈🥉 podium |

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

Built for the Operating Systems Midterm Project.

**NusaCatch** — *Cast your line. Claim the throne.* 🐟
