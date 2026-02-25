import fs from 'fs';
import path from 'path';
import { aaveAdapter } from './adapters/aave.js';
import { compoundAdapter } from './adapters/compound.js';
import { radiantAdapter } from './adapters/radiant.js';
import { morphoAdapter } from './adapters/morpho.js';
import { DATA_DIR } from '../dataPath.js';

// Master registry of all known protocol adapters
// To add a new protocol: create an adapter in ./adapters/, import it here, add to ALL_ADAPTERS
const ALL_ADAPTERS = [aaveAdapter, compoundAdapter, radiantAdapter, morphoAdapter];

const CONFIG_FILE = path.join(DATA_DIR, 'protocols.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Returns all protocols with runtime overrides (from data/protocols.json) applied
// Protocols marked as deleted are filtered out
export function getAllProtocols() {
  const config = readConfig();
  return ALL_ADAPTERS
    .filter(a => !config[a.id]?.deleted)
    .map(a => {
      const override = config[a.id];
      return {
        ...a,
        enabled: override?.enabled !== undefined ? override.enabled : a.enabled,
      };
    });
}

export function getEnabledProtocols() {
  return getAllProtocols().filter(p => p.enabled);
}

export function getProtocol(id) {
  return getAllProtocols().find(p => p.id === id) || null;
}

// Toggle a protocol's enabled state — persisted to data/protocols.json
export function setProtocolEnabled(id, enabled) {
  const config = readConfig();
  config[id] = { ...(config[id] || {}), enabled };
  writeConfig(config);
}

// Mark a protocol as deleted — it will be hidden from all registries
export function deleteProtocol(id) {
  const config = readConfig();
  config[id] = { ...(config[id] || {}), deleted: true, enabled: false };
  writeConfig(config);
}

// Restore a deleted protocol
export function restoreProtocol(id) {
  const config = readConfig();
  if (config[id]) {
    delete config[id].deleted;
  }
  writeConfig(config);
}

// Fetch APRs from all enabled protocols concurrently
export async function fetchAllAPRs() {
  const protocols = getEnabledProtocols();

  const results = await Promise.allSettled(
    protocols.map(async p => ({ id: p.id, apr: await p.getAPR() }))
  );

  const aprs = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      aprs[r.value.id] = r.value.apr;
    }
  }

  // Identify the best (highest APR) enabled protocol
  let bestId = null;
  let bestAPR = -Infinity;
  for (const [id, apr] of Object.entries(aprs)) {
    if (apr > bestAPR) {
      bestAPR = apr;
      bestId = id;
    }
  }

  return {
    aprs,
    best: bestId,
    bestAPR: bestAPR === -Infinity ? 0 : bestAPR,
    timestamp: Date.now(),
  };
}
