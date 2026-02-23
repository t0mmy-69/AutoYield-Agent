// aprFetcher.js — thin wrapper over the protocol registry
// All APR fetching logic lives in lib/protocols/adapters/*.js

import { fetchAllAPRs as registryFetchAll, getProtocol } from './protocols/index.js';

// Primary function — fetch APRs from all enabled protocols
export async function fetchAllAPRs() {
  return registryFetchAll();
}

// Legacy wrapper — kept for any code that still reads aaveAPR/compoundAPR
export async function fetchBothAPRs() {
  const snapshot = await registryFetchAll();
  return {
    ...snapshot,
    aaveAPR: snapshot.aprs['aave'] ?? null,
    compoundAPR: snapshot.aprs['compound'] ?? null,
    delta: Math.abs((snapshot.aprs['aave'] ?? 0) - (snapshot.aprs['compound'] ?? 0)),
  };
}

export async function getAaveAPR() {
  return getProtocol('aave').getAPR();
}

export async function getCompoundAPR() {
  return getProtocol('compound').getAPR();
}
