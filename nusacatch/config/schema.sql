-- NusaCatch Database Schema
-- Run: psql -U nusauser -d nusacatch -f config/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catches (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     REFERENCES users(id) ON DELETE CASCADE,
    fish_name    VARCHAR(100) NOT NULL,
    size_inches  DECIMAL(5,2) NOT NULL,
    weight_lbs   DECIMAL(6,2) DEFAULT NULL,
    location     VARCHAR(150) DEFAULT NULL,
    image_path   TEXT         NOT NULL,
    description  TEXT         DEFAULT NULL,
    submitted_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catches_size ON catches(size_inches DESC);
CREATE INDEX IF NOT EXISTS idx_catches_user ON catches(user_id);
