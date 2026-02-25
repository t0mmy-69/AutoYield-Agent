/**
 * SQLite database layer — replaces per-user JSON files.
 * Global admin data (credentials, protocols, chains) stays in JSON for backwards compat.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from './dataPath.js';

const DB_PATH = path.join(DATA_DIR, 'autoyield.db');

// Default rules template
const DEFAULT_RULES = {
  minDeltaPct: 0.4,
  confidenceThreshold: 0.6,
  minPersistenceChecks: 4,
  cooldownMinutes: 60,
  maxGasUsdPerMove: 2,
  maxTotalValueUsd: 50000,
  maxMovesPerYear: 52,
  executionMode: 'telegram_approval',
};

let _db = null;

export function getDb() {
  if (_db) return _db;

  // Ensure data/ directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      address  TEXT    UNIQUE NOT NULL COLLATE NOCASE,
      created_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS agent_wallets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address       TEXT    NOT NULL,
      encrypted_key TEXT    NOT NULL,
      chain_id      TEXT    NOT NULL DEFAULT 'sepolia',
      created_at    INTEGER DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS user_rules (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      rules   TEXT    NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS user_state (
      user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_protocol  TEXT    NOT NULL DEFAULT 'aave',
      last_move_timestamp INTEGER NOT NULL DEFAULT 0,
      pending_approval  TEXT    DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS user_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action      TEXT    NOT NULL,
      details     TEXT    NOT NULL DEFAULT '{}',
      executed_at INTEGER DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS auth_nonces (
      address    TEXT    PRIMARY KEY COLLATE NOCASE,
      nonce      TEXT    NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduler_lock (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      locked_at  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS telegram_callbacks (
      callback_id  TEXT    PRIMARY KEY,
      processed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
  `);

  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function upsertUser(address) {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (address) VALUES (?) ON CONFLICT(address) DO NOTHING
  `).run(address.toLowerCase());
  return db.prepare('SELECT * FROM users WHERE address = ?').get(address.toLowerCase());
}

export function getUserByAddress(address) {
  return getDb().prepare('SELECT * FROM users WHERE address = ?').get(address.toLowerCase());
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getAllUsers() {
  return getDb().prepare('SELECT * FROM users').all();
}

// ─── Agent Wallets ─────────────────────────────────────────────────────────────

export function saveAgentWallet(userId, address, encryptedKey, chainId = 'sepolia') {
  getDb().prepare(`
    INSERT INTO agent_wallets (user_id, address, encrypted_key, chain_id)
    VALUES (?, ?, ?, ?)
  `).run(userId, address, encryptedKey, chainId);
}

export function getAgentWallet(userId) {
  return getDb().prepare('SELECT * FROM agent_wallets WHERE user_id = ?').get(userId);
}

// ─── User Rules ────────────────────────────────────────────────────────────────

export function getUserRules(userId) {
  const row = getDb().prepare('SELECT rules FROM user_rules WHERE user_id = ?').get(userId);
  if (!row) return { ...DEFAULT_RULES };
  try {
    return { ...DEFAULT_RULES, ...JSON.parse(row.rules) };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

export function setUserRules(userId, rules) {
  const db = getDb();
  const json = JSON.stringify(rules);
  db.prepare(`
    INSERT INTO user_rules (user_id, rules) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET rules = excluded.rules
  `).run(userId, json);
}

// ─── User State ────────────────────────────────────────────────────────────────

export function getUserState(userId) {
  const db = getDb();
  let row = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(userId);
  if (!row) {
    // Init default state
    db.prepare(`
      INSERT INTO user_state (user_id, current_protocol, last_move_timestamp)
      VALUES (?, 'aave', 0)
    `).run(userId);
    row = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(userId);
  }
  return {
    currentProtocol: row.current_protocol,
    lastMoveTimestamp: row.last_move_timestamp,
    pendingApproval: row.pending_approval ? JSON.parse(row.pending_approval) : null,
  };
}

export function setUserState(userId, state) {
  const db = getDb();
  db.prepare(`
    INSERT INTO user_state (user_id, current_protocol, last_move_timestamp, pending_approval)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      current_protocol = excluded.current_protocol,
      last_move_timestamp = excluded.last_move_timestamp,
      pending_approval = excluded.pending_approval
  `).run(
    userId,
    state.currentProtocol ?? 'aave',
    state.lastMoveTimestamp ?? 0,
    state.pendingApproval != null ? JSON.stringify(state.pendingApproval) : null,
  );
}

// ─── User History ──────────────────────────────────────────────────────────────

export function appendUserHistory(userId, entry) {
  getDb().prepare(`
    INSERT INTO user_history (user_id, action, details, executed_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, entry.action, JSON.stringify(entry), entry.executedAt ?? Date.now());
}

export function getUserHistory(userId, limit = 100) {
  const rows = getDb().prepare(`
    SELECT * FROM user_history WHERE user_id = ? ORDER BY executed_at DESC LIMIT ?
  `).all(userId, limit);
  return rows.map(r => JSON.parse(r.details));
}

// ─── Auth Nonces ───────────────────────────────────────────────────────────────

export function saveNonce(address, nonce, ttlMs = 5 * 60 * 1000) {
  const expiresAt = Date.now() + ttlMs;
  getDb().prepare(`
    INSERT INTO auth_nonces (address, nonce, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce, expires_at = excluded.expires_at
  `).run(address.toLowerCase(), nonce, expiresAt);
}

export function getNonce(address) {
  const row = getDb().prepare('SELECT * FROM auth_nonces WHERE address = ?').get(address.toLowerCase());
  if (!row) return null;
  if (Date.now() > row.expires_at) {
    getDb().prepare('DELETE FROM auth_nonces WHERE address = ?').run(address.toLowerCase());
    return null;
  }
  return row.nonce;
}

export function deleteNonce(address) {
  getDb().prepare('DELETE FROM auth_nonces WHERE address = ?').run(address.toLowerCase());
}

// ─── Scheduler Lock ────────────────────────────────────────────────────────────

export function acquireSchedulerLock(userId, ttlMs = 4 * 60 * 1000) {
  const db = getDb();
  const now = Date.now();
  const row = db.prepare('SELECT locked_at FROM scheduler_lock WHERE user_id = ?').get(userId);
  if (row && now - row.locked_at < ttlMs) return false; // still locked
  db.prepare(`
    INSERT INTO scheduler_lock (user_id, locked_at) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET locked_at = excluded.locked_at
  `).run(userId, now);
  return true;
}

export function releaseSchedulerLock(userId) {
  getDb().prepare('DELETE FROM scheduler_lock WHERE user_id = ?').run(userId);
}

// ─── Telegram Callback Dedup ───────────────────────────────────────────────────

/** Returns true if this Telegram callback_query_id was already processed. */
export function isTelegramCallbackProcessed(callbackId) {
  return !!getDb().prepare('SELECT 1 FROM telegram_callbacks WHERE callback_id = ?').get(callbackId);
}

/** Mark a Telegram callback_query_id as processed (idempotent). */
export function markTelegramCallbackProcessed(callbackId) {
  getDb().prepare(
    'INSERT OR IGNORE INTO telegram_callbacks (callback_id) VALUES (?)'
  ).run(String(callbackId));
}
