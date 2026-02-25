import fs from 'fs';
import path from 'path';
import { aaveAdapter, createAaveAdapter } from './adapters/aave.js';
import { compoundAdapter, createCompoundAdapter } from './adapters/compound.js';
import { radiantAdapter } from './adapters/radiant.js';
import { morphoAdapter } from './adapters/morpho.js';
import { DATA_DIR } from '../dataPath.js';

// Master registry of all built-in protocol adapters
const BUILTIN_ADAPTERS = [aaveAdapter, compoundAdapter, radiantAdapter, morphoAdapter];

// Map adapter type → factory function for custom protocol instances
const ADAPTER_FACTORIES = {
  aave: createAaveAdapter,
  compound: createCompoundAdapter,
};

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

/**
 * Build adapter instances for custom protocol entries stored in protocols.json.
 * Custom entries have { custom: true, type: 'aave'|'compound', ... }.
 */
function getCustomAdapters(config) {
  const adapters = [];
  for (const [id, entry] of Object.entries(config)) {
    if (!entry.custom || entry.deleted) continue;
    const factory = ADAPTER_FACTORIES[entry.type];
    if (!factory) continue;
    try {
      adapters.push(factory({ ...entry, id }));
    } catch (err) {
      console.error(`[protocols] Failed to create custom adapter "${id}":`, err.message);
    }
  }
  return adapters;
}

// Returns all protocols with runtime overrides (from data/protocols.json) applied
// Protocols marked as deleted are filtered out
export function getAllProtocols() {
  const config = readConfig();
  const customAdapters = getCustomAdapters(config);

  const builtins = BUILTIN_ADAPTERS
    .filter(a => !config[a.id]?.deleted)
    .map(a => {
      const override = config[a.id];
      return {
        ...a,
        enabled: override?.enabled !== undefined ? override.enabled : a.enabled,
      };
    });

  return [...builtins, ...customAdapters];
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

/**
 * Register a new custom protocol instance.
 * type: 'aave' | 'compound'
 * Returns the created adapter config or throws if invalid.
 */
export function addCustomProtocol({ id, type, name, chain, contractAddress, usdcAddress, color }) {
  if (!id || !type || !name || !chain || !contractAddress) {
    throw new Error('Required: id, type, name, chain, contractAddress');
  }
  if (!ADAPTER_FACTORIES[type]) {
    throw new Error(`Unsupported protocol type: "${type}". Supported: ${Object.keys(ADAPTER_FACTORIES).join(', ')}`);
  }
  const config = readConfig();
  if (config[id] && !config[id].deleted) {
    throw new Error(`Protocol ID "${id}" already exists`);
  }
  // Check built-ins too
  if (BUILTIN_ADAPTERS.some(a => a.id === id)) {
    throw new Error(`Protocol ID "${id}" conflicts with a built-in adapter`);
  }
  const entry = {
    custom: true,
    type,
    id,
    name,
    chain,
    contractAddress,
    usdcAddress: usdcAddress || '',
    color: color || '#818cf8',
    enabled: true,
  };
  config[id] = entry;
  writeConfig(config);
  return entry;
}

/**
 * Fetch APRs from all enabled protocols concurrently.
 * Returns null for protocols where APR fetch failed — never fakes data.
 *
 * Result shape:
 * {
 *   aprs: { [id]: number },           // only protocols with valid APR
 *   aprErrors: { [id]: string },      // protocols that returned null or threw
 *   best: string | null,              // id of protocol with highest APR
 *   bestAPR: number,
 *   timestamp: number,
 * }
 */
export async function fetchAllAPRs() {
  const protocols = getEnabledProtocols();

  const results = await Promise.allSettled(
    protocols.map(async p => ({ id: p.id, apr: await p.getAPR() }))
  );

  const aprs = {};
  const aprErrors = {};

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.apr !== null && r.value.apr !== undefined) {
        aprs[r.value.id] = r.value.apr;
      } else {
        aprErrors[r.value.id] = 'APR source unavailable';
      }
    } else {
      // Promise itself rejected (shouldn't happen since adapters catch internally)
      const id = r.reason?.id ?? 'unknown';
      aprErrors[id] = r.reason?.message || 'Unknown error';
    }
  }

  // Identify the best (highest APR) enabled protocol — only from valid APRs
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
    aprErrors,
    best: bestId,
    bestAPR: bestAPR === -Infinity ? 0 : bestAPR,
    timestamp: Date.now(),
  };
}
