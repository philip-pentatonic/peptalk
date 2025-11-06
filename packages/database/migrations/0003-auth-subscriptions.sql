-- Migration: Add authentication and subscription columns
-- Created: 2025-11-04

-- Add subscription columns to users table
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive' CHECK(subscription_status IN ('inactive', 'active', 'canceled'));
ALTER TABLE users ADD COLUMN subscription_plan TEXT CHECK(subscription_plan IN ('monthly', 'annual', NULL));

-- Update sessions table to use TEXT for expires_at (ISO8601 format)
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Magic links table for passwordless authentication
CREATE TABLE magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);
