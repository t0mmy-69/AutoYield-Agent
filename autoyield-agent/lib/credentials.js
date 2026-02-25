import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPath.js';

const CRED_FILE = path.join(DATA_DIR, 'credentials.json');

// All known credential keys with metadata for the admin UI
export const CREDENTIAL_SCHEMA = {
  // Sepolia (Phase 1 — live)
  RPC_URL:                  { chain: 'sepolia',  label: 'RPC URL',            placeholder: 'https://sepolia.infura.io/v3/YOUR_KEY' },
  USDC_ADDRESS:             { chain: 'sepolia',  label: 'USDC Contract',      placeholder: '0xUsdc...' },
  AAVE_POOL_ADDRESS:        { protocol: 'aave',  label: 'Aave Pool Address',  placeholder: '0xAavePool...' },
  COMPOUND_COMET_ADDRESS:   { protocol: 'compound', label: 'Compound Comet', placeholder: '0xComet...' },

  // Arbitrum (Phase 2)
  ARBITRUM_RPC_URL:         { chain: 'arbitrum', label: 'RPC URL',            placeholder: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY' },
  ARBITRUM_USDC_ADDRESS:    { chain: 'arbitrum', label: 'USDC Contract',      placeholder: '0xUsdc...' },
  RADIANT_POOL_ADDRESS:     { protocol: 'radiant', label: 'Radiant Pool',     placeholder: '0xRadiant...' },

  // Optimism (Phase 2)
  OPTIMISM_RPC_URL:         { chain: 'optimism', label: 'RPC URL',            placeholder: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY' },
  OPTIMISM_USDC_ADDRESS:    { chain: 'optimism', label: 'USDC Contract',      placeholder: '0xUsdc...' },

  // Base (Phase 2)
  BASE_RPC_URL:             { chain: 'base',     label: 'RPC URL',            placeholder: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY' },
  BASE_USDC_ADDRESS:        { chain: 'base',     label: 'USDC Contract',      placeholder: '0xUsdc...' },
  MORPHO_POOL_ADDRESS:      { protocol: 'morpho', label: 'Morpho Pool',       placeholder: '0xMorpho...' },
};

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Get a single credential value.
 * Priority: data/credentials.json → process.env → ''
 */
export function getCredential(key) {
  const file = readFile();
  return file[key] || process.env[key] || '';
}

/**
 * Save credential updates to data/credentials.json.
 * Pass empty string to clear a key (removes from file, falls back to env).
 */
export function saveCredentials(updates) {
  const existing = readFile();
  const merged = { ...existing };
  for (const [k, v] of Object.entries(updates)) {
    if (v === '' || v == null) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  const dir = path.dirname(CRED_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CRED_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

/**
 * Returns status for each known credential key:
 * { key, label, fileValue, source: 'file' | 'env' | 'unset' }
 */
export function getCredentialStatus() {
  const file = readFile();
  return Object.entries(CREDENTIAL_SCHEMA).map(([key, meta]) => ({
    key,
    ...meta,
    fileValue: file[key] || '',
    source: file[key] ? 'file' : process.env[key] ? 'env' : 'unset',
  }));
}
