# AutoYield Agent — Changelog

## [Unreleased] — APR Integrity, Custom Protocol Registry & Admin UI

All fixes live on branch `claude/review-autoyield-spec-TLo9m`.

---

### Critical (fake on-chain data)

#### 1. Fix AAVE APR always returning 0% on Sepolia
**File:** `lib/protocols/adapters/aave.js`

AAVE V3 Sepolia uses its own testnet USDC (`0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`),
not Circle's Sepolia USDC (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`) used by Compound.
Querying `getReserveData()` with the wrong token address returns `currentLiquidityRate = 0`,
making APR appear as 0%.

```diff
- const usdcAddress = getCredential('USDC_ADDRESS');
+ const usdcAddress =
+   getCredential('AAVE_USDC_ADDRESS') ||
+   '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8'; // AAVE Sepolia default
```

On mainnet both protocols use the same USDC (`0xA0b8...`), so `AAVE_USDC_ADDRESS` only
needs to be set when running on a testnet where the addresses diverge.

#### 2. Remove hardcoded fake APR fallbacks
**Files:** `lib/protocols/adapters/aave.js`, `lib/protocols/adapters/compound.js`

Catch blocks silently returned fabricated values (`4.20` / `3.60`) whenever the RPC
call failed (wrong address, wrong chain, misconfigured credentials). The agent would
continue making rotation decisions based on invented data.

```diff
  async getAPR() {
    try {
      ...
    } catch (err) {
      console.error('[AAVE getAPR error]', err?.message ?? err);
-     return 4.20; // testnet fallback
+     return null; // never fake data — let UI show "APR unavailable"
    }
  },
```

`fetchAllAPRs()` now collects failed adapters into a separate `aprErrors` map instead
of mixing them into the `aprs` map. Only protocols with a valid numeric APR participate
in the best-protocol selection.

---

### New features

#### 3. Custom protocol registry — add any AAVE/Compound instance at runtime
**Files:** `lib/protocols/adapters/aave.js`, `lib/protocols/adapters/compound.js`,
`lib/protocols/index.js`, `pages/api/protocols.js`

Admin can register a new protocol instance (e.g. "AAVE V3 on Arbitrum") without
writing code:

- `createAaveAdapter(config)` / `createCompoundAdapter(config)` — factory functions
  exported from each adapter file.
- `addCustomProtocol({ id, type, name, chain, contractAddress, usdcAddress })` — stores
  the entry in `data/protocols.json` and instantiates a live adapter on next registry read.
- `POST /api/protocols` — API endpoint (admin-only) to call the above.

```json
// data/protocols.json entry created by the API
"aave-arbitrum": {
  "custom": true,
  "type": "aave",
  "id": "aave-arbitrum",
  "name": "AAVE V3 (Arbitrum One)",
  "chain": "arbitrum",
  "contractAddress": "0x...",
  "usdcAddress": "0x...",
  "enabled": true
}
```

#### 4. Chain-aware provider
**File:** `lib/agentWallet.js`

Added `getProviderForChain(chainId)` that resolves the correct RPC URL for any registered
chain, falling back to the default Sepolia provider if the chain RPC is not configured.

```js
export function getProviderForChain(chainId) {
  const chain = CHAINS[chainId];
  if (!chain) return getProvider();
  const rpcUrl = getCredential(chain.rpcEnvVar) || process.env[chain.rpcEnvVar];
  if (!rpcUrl) return getProvider();
  return new ethers.JsonRpcProvider(rpcUrl);
}
```

---

### Admin UI improvements

#### 5. "Add Protocol" button and modal
**File:** `components/ProtocolPanel.jsx`

Protocol Registry now has a "+ Add Protocol" button (visible in admin mode) that opens
a form modal with fields: Protocol Type, Display Name, Network, Contract Address,
USDC Address for APR query. The Protocol ID is auto-generated from name + chain.
Custom protocols are labelled with a `CUSTOM` tag in the table.

#### 6. APR error display in Protocol Registry and Live APR Snapshot
**Files:** `components/ProtocolPanel.jsx`, `pages/admin.js`

- Protocol rows now show `⚠ N/A` (red, with error tooltip) when APR fetch failed,
  instead of `—` which was ambiguous.
- Live APR Snapshot section renders separate error cards (red border) for failed
  protocols, showing the error reason.

#### 7. AAVE_USDC_ADDRESS credential field
**File:** `pages/admin.js`

Added `USDC for APR Query` field to the AAVE V3 credential card with a placeholder
showing the correct Sepolia default address, making the configuration discoverable.

---

## Files Changed (this batch)

| File | Change |
|---|---|
| `lib/protocols/adapters/aave.js` | Fix USDC address; return null on error; add `createAaveAdapter` factory |
| `lib/protocols/adapters/compound.js` | Return null on error; add `createCompoundAdapter` factory |
| `lib/protocols/index.js` | Support custom protocol instances; `aprErrors` in `fetchAllAPRs` |
| `lib/agentWallet.js` | Add `getProviderForChain(chainId)` |
| `pages/api/protocols.js` | Add POST handler for custom protocol registration |
| `components/ProtocolPanel.jsx` | APR error display; "Add Protocol" button + modal |
| `pages/admin.js` | `AAVE_USDC_ADDRESS` credential; APR error cards; pass `aprErrors` to ProtocolPanel |

---

## [Unreleased] — Security & Bug Fixes

All fixes live on branch `claude/review-autoyield-spec-TLo9m`.

---

### Critical (would crash or allow key theft)

#### 1. Fix broken import paths in protocol adapters
**Files:** `lib/protocols/adapters/aave.js`, `lib/protocols/adapters/compound.js`

Both adapters imported from `../../agentWallet.js` and `../../credentials.js` but the
files are one level up, not two. Every call to `getAPR()`, `supply()`, and `withdraw()`
would throw `ERR_MODULE_NOT_FOUND` and fall back to hardcoded APR values (4.20 % / 3.60 %).

```diff
- import { getProvider, approveToken } from '../../agentWallet.js';
- import { getCredential } from '../../credentials.js';
+ import { getProvider, approveToken } from '../agentWallet.js';
+ import { getCredential } from '../credentials.js';
```

#### 2. Remove hardcoded WALLET_ENCRYPTION_KEY
**File:** `lib/userWallet.js`

The AES-256-CBC key used to encrypt agent private keys had a public hardcoded fallback
(`autoyield-dev-encryption-key-32b!`). Anyone with database read access could decrypt all
wallets. Now throws at call-time if the env var is not set.

```diff
- const raw = process.env.WALLET_ENCRYPTION_KEY || 'autoyield-dev-encryption-key-32b!';
+ const raw = process.env.WALLET_ENCRYPTION_KEY;
+ if (!raw) throw new Error('WALLET_ENCRYPTION_KEY is not set. ...');
```

**Action required on deploy:** set `WALLET_ENCRYPTION_KEY` to a 32-byte hex string:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Remove hardcoded SESSION_SECRET
**File:** `lib/auth.js`

The HMAC key for session tokens had a public hardcoded fallback (`autoyield-dev-secret-change-in-prod`).
Anyone who knew the default could forge a session token for any user ID. Now throws on
module load if the env var is not set.

```diff
- const SESSION_SECRET = process.env.SESSION_SECRET || 'autoyield-dev-secret-change-in-prod';
+ if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set. ...');
+ const SESSION_SECRET = process.env.SESSION_SECRET;
```

**Action required on deploy:** set `SESSION_SECRET` to a 32-byte hex string (separate from
`WALLET_ENCRYPTION_KEY`).

---

### Security (access control)

#### 4. Add admin auth guard to sensitive endpoints
**New:** `lib/auth.js` → `withAdminAuth(handler)` middleware
**Protected endpoints:**
| Endpoint | Methods |
|---|---|
| `GET /api/admin/agents` | all |
| `PUT /api/credentials` | PUT |
| `PATCH /api/chains` | PATCH, DELETE |
| `PATCH /api/protocols` | PATCH, DELETE |

The middleware checks the `x-admin-secret` request header (or `__admin` cookie) against the
`ADMIN_SECRET` environment variable. Returns `401` if missing/wrong, `503` if `ADMIN_SECRET`
is not configured on the server.

**Action required on deploy:** set `ADMIN_SECRET` to a strong password.

**Admin page:** now shows an unlock modal on 401 responses. The entered secret is stored in
`sessionStorage` and sent as `x-admin-secret` with every write request. Read-only endpoints
(`GET /api/chains`, `GET /api/protocols`, `GET /api/credentials`) remain public.

---

### High (functional bugs)

#### 5. Fix Execution Mode always showing "—" in Admin dashboard
**File:** `pages/api/rules.js`

`readRules()` returned `{}` when `data/rules.json` doesn't exist, so the admin
System Overview card showed `—` for Execution Mode. Now merges with `DEFAULT_RULES`
(same defaults as `lib/db.js`) as fallback.

```diff
  export function readRules() {
    try {
-     return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
+     const saved = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
+     return { ...DEFAULT_RULES, ...saved };
    } catch {
-     return {};
+     return { ...DEFAULT_RULES };
    }
  }
```

#### 6. Fix pending approval never cleared / overwritten silently
**File:** `lib/scheduler.js`

Two sub-bugs:
1. Expired pending approvals were never cleaned up — they blocked new ROTATE decisions forever.
2. A valid pending approval could be silently overwritten when the scheduler ran again before
   the user had time to approve/reject.

```js
// Clear expired pending approval at start of each cycle
if (state.pendingApproval?.expiresAt && Date.now() > state.pendingApproval.expiresAt) {
  state = { ...state, pendingApproval: null };
  writeStateForUser(userId, state);
}

// Skip if user hasn't acted on previous pending approval yet
if (state.pendingApproval?.expiresAt && Date.now() < state.pendingApproval.expiresAt) {
  return { userId, decision, skipped: 'existing_pending' };
}
```

#### 7. Fix session token HMAC validation — potential throw on malformed input
**File:** `lib/auth.js`

`crypto.timingSafeEqual` requires both buffers to have the same length. If `mac` in the token
was truncated or not valid hex, `Buffer.from(mac, 'hex')` could produce a different-length
buffer than `expected`, causing an uncaught throw inside the `try/catch` (swallowed but
still incorrect). Added explicit length guard.

```diff
+ const macBuf = Buffer.from(mac, 'hex');
+ const expBuf = Buffer.from(expected, 'hex');
+ if (macBuf.length !== expBuf.length) return null;
- if (!crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))) return null;
+ if (!crypto.timingSafeEqual(macBuf, expBuf)) return null;
```

---

### Medium (new endpoints & rate limiting)

#### 8. Add `GET /api/health`
**New file:** `pages/api/health.js`

Returns system health for Railway health probes and uptime monitors. Checks DB
connectivity and scheduler state. Returns `200 ok` or `503 degraded`.

```json
{
  "status": "ok",
  "timestamp": 1740480000000,
  "checks": {
    "db": "ok",
    "scheduler": "running",
    "uptimeSeconds": 3600
  }
}
```

#### 9. Add `GET /api/scheduler/status` (admin-only)
**New file:** `pages/api/scheduler/status.js`

Exposes in-process scheduler stats without having to tail server logs.

```json
{
  "running": true,
  "startedAt": 1740476400000,
  "lastRunAt": 1740480000000,
  "lastRunUsers": 3,
  "totalRuns": 48
}
```

#### 10. Rate limit `POST /api/check`
**File:** `pages/api/check.js`

Each manual check triggers APR fetches from multiple RPC endpoints + CoinGecko gas price.
Added a 60-second per-user (or per-IP when unauthenticated) in-memory rate limit.

```
HTTP 429 Too many requests. Please wait 60 seconds between manual checks.
```

---

### Low (cosmetic)

#### 11. Fix Vietnamese text in chain delete dialog
**File:** `pages/admin.js`

```diff
- if (!confirm(`Xóa chain "${name}" khỏi danh sách? Có thể restore lại bằng cách xóa data/chains.json.`)) return;
+ if (!confirm(`Remove chain "${name}" from the list? You can restore it by deleting data/chains.json.`)) return;
```

---

## Environment Variables Required After This Merge

| Variable | Purpose | How to generate |
|---|---|---|
| `WALLET_ENCRYPTION_KEY` | AES-256 key for agent private key encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | HMAC key for session tokens | same as above (use a different value) |
| `ADMIN_SECRET` | Password for admin dashboard endpoints | any strong random string |

> **Note:** `CRON_SECRET` was already optional. Setting it is still recommended for
> production to prevent unauthenticated cron triggers.

---

## Files Changed

| File | Change |
|---|---|
| `lib/protocols/adapters/aave.js` | Fix import paths |
| `lib/protocols/adapters/compound.js` | Fix import paths |
| `lib/userWallet.js` | Throw if WALLET_ENCRYPTION_KEY missing |
| `lib/auth.js` | Throw if SESSION_SECRET missing; add withAdminAuth; fix timingSafeEqual length guard |
| `lib/scheduler.js` | Clear expired pending approvals; skip if active pending exists; expose scheduler stats |
| `pages/api/rules.js` | readRules() merges with DEFAULT_RULES |
| `pages/api/admin/agents.js` | Protected with withAdminAuth |
| `pages/api/credentials.js` | PUT protected with withAdminAuth |
| `pages/api/chains.js` | PATCH/DELETE protected with withAdminAuth |
| `pages/api/protocols.js` | PATCH/DELETE protected with withAdminAuth |
| `pages/api/check.js` | 60-second rate limiting |
| `pages/admin.js` | Admin secret prompt/storage; adminFetch helper; English dialog text |
| `pages/api/health.js` | **New** — health check endpoint |
| `pages/api/scheduler/status.js` | **New** — scheduler stats endpoint (admin-only) |
