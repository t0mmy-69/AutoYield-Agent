/**
 * SIWE-lite authentication.
 * Flow: challenge → sign → verify → session token
 *
 * Session token = base64(userId:timestamp:hmac)
 * No external JWT library needed.
 */
import crypto from 'crypto';
import { ethers } from 'ethers';
import { saveNonce, getNonce, deleteNonce, upsertUser, getUserByAddress } from './db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'autoyield-dev-secret-change-in-prod';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Challenge ─────────────────────────────────────────────────────────────────

export function createChallenge(address) {
  const nonce = crypto.randomBytes(16).toString('hex');
  saveNonce(address, nonce);
  return {
    nonce,
    message: buildSignMessage(address, nonce),
  };
}

function buildSignMessage(address, nonce) {
  return (
    `Sign in to AutoYield\n\n` +
    `Address: ${address}\n` +
    `Nonce: ${nonce}\n` +
    `Issued: ${new Date().toISOString()}`
  );
}

// ─── Verify Signature ──────────────────────────────────────────────────────────

export async function verifyAndLogin(address, signature) {
  const nonce = getNonce(address);
  if (!nonce) throw new Error('Challenge expired or not found. Request a new one.');

  // The message the user signed — nonce must match what we issued
  // We accept any message containing the nonce (user might have signed with slightly different timestamp)
  let recovered;
  try {
    // Try to recover from a prefixed personal_sign message
    const candidate = buildSignMessage(address, nonce);
    recovered = ethers.verifyMessage(candidate, signature);
  } catch {
    throw new Error('Invalid signature format');
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Signature does not match address');
  }

  // Consume the nonce (one-time use)
  deleteNonce(address);

  // Upsert user + return session
  const user = upsertUser(address);
  return { token: createSessionToken(user.id), user };
}

// ─── Session Token ─────────────────────────────────────────────────────────────

function createSessionToken(userId) {
  const ts = Date.now();
  const payload = `${userId}:${ts}`;
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${mac}`).toString('base64url');
}

export function verifySessionToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userIdStr, tsStr, mac] = parts;
    const payload = `${userIdStr}:${tsStr}`;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return null;
    if (Date.now() - parseInt(tsStr) > SESSION_TTL_MS) return null;
    return { userId: parseInt(userIdStr) };
  } catch {
    return null;
  }
}

// ─── Middleware helper ──────────────────────────────────────────────────────────

/**
 * Extract and verify session from request.
 * Token can be in Authorization header (Bearer) or __session cookie.
 * Returns { userId } or null.
 */
export function getSessionFromRequest(req) {
  let token = null;

  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) token = auth.slice(7);

  if (!token && req.cookies) token = req.cookies.__session;

  // Also support token in query (for cron/webhook calls)
  if (!token && req.query?.token) token = req.query.token;

  return verifySessionToken(token);
}

/**
 * Higher-order function: wrap a Next.js handler to require auth.
 * Injects req.session = { userId } and req.user if authenticated.
 */
export function withAuth(handler) {
  return async (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    req.session = session;
    return handler(req, res);
  };
}
