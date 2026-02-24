# AutoYield Agent — System Documentation

Welcome to the comprehensive system documentation for **AutoYield Agent**. This document serves as the master reference for the project's architecture, core modules, API surface, user interface, and integration points.

> **Last updated:** 2026-02-24
> **Version:** 3.1 — Any-EVM Sign-In, Testnet Multi-Chain Deposits (ETH Sepolia · Base Sepolia · Arbitrum Sepolia)

---

## Table of Contents

1. [Introduction & Vision](#1-introduction--vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Authentication & Multi-User](#3-authentication--multi-user)
4. [Protocol Adapter System](#4-protocol-adapter-system)
5. [Chain Configuration](#5-chain-configuration)
6. [Core Engine Modules](#6-core-engine-modules)
7. [24/7 Scheduler](#7-247-scheduler)
8. [API Reference](#8-api-reference)
9. [User Interface](#9-user-interface)
10. [Data Layer](#10-data-layer)
11. [Environment Variables](#11-environment-variables)
12. [Roadmap](#12-roadmap)
13. [Getting Started](#13-getting-started)
14. [Changelog](#14-changelog)

---

## 1. Introduction & Vision

**AutoYield Agent** is an autonomous AI-driven DeFi protocol designed to maximize yield farming returns with minimal effort and risk.

In the highly volatile DeFi landscape, manual yield optimization is inefficient and gas-heavy. AutoYield solves this by employing an intelligent, continuous-monitoring agent that evaluates **N lending protocols across multiple chains** in real-time. When optimal conditions are met — factoring in historical trends, momentum, confidence scoring, and gas costs — the agent auto-routes funds to the highest-yielding protocol.

The architecture is designed from the ground up for scale: adding a new protocol requires only a single adapter file, and adding a new chain requires only a configuration entry.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
│  Landing (/)  │  DApp (/dapp)  │  Admin (/admin)               │
│               │  MetaMask SIWE │                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (Bearer token)
┌──────────────────────────▼──────────────────────────────────────┐
│                  API Routes (pages/api/)                         │
│  /auth/challenge  /auth/verify  /auth/me                        │
│  /check  /approve  /apr  /state  /rules  /history               │
│  /protocols  /chains  /credentials  /telegram/*  /cron          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Core Engine (lib/)                            │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────┐                     │
│  │  Auth (SIWE)     │  │  Scheduler      │                     │
│  │  lib/auth.js     │  │  lib/scheduler.js│                    │
│  └──────────────────┘  └─────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────┐                     │
│  │  User Wallet     │  │  Protocol Reg.  │                     │
│  │  lib/userWallet  │  │  lib/protocols/ │                     │
│  └──────────────────┘  └─────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────┐                     │
│  │  Decision Engine │  │  Executor       │                     │
│  │  decisionEngine  │  │  executor.js    │                     │
│  └──────────────────┘  └─────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────┐                     │
│  │  APR History     │  │  Chain Registry │                     │
│  │  aprHistory.js   │  │  lib/chains/    │                     │
│  └──────────────────┘  └─────────────────┘                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Data Layer                                    │
│                                                                  │
│  SQLite DB (data/autoyield.db) — per-user data                  │
│  ┌──────────────┬──────────────┬──────────────────────────┐    │
│  │ users        │ agent_wallets│ user_state / user_rules  │    │
│  │ auth_nonces  │ user_history │ scheduler_lock            │    │
│  └──────────────┴──────────────┴──────────────────────────┘    │
│                                                                  │
│  JSON files (data/) — global/admin data                         │
│  state.json  rules.json  aprHistory.json  history.json          │
│  protocols.json  credentials.json  telegram.json                │
└─────────────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** Next.js, React, CSS Modules
- **Backend:** Next.js API routes, Node.js
- **Database:** SQLite via `better-sqlite3` (per-user data), JSON files (global/admin)
- **Auth:** SIWE-lite (EIP-191 personal_sign + HMAC-SHA256 session tokens)
- **Blockchain:** ethers.js v6
- **Notifications:** Telegram Bot API
- **Networks (deposit):** Ethereum Sepolia · Base Sepolia · Arbitrum Sepolia (Phase 1 testnets)
- **Sign-in:** Any EVM network (Polygon, Mainnet, Arbitrum, etc.) — no network switching required

---

## 3. Authentication & Multi-User

### Any-EVM Sign-In

The sign-in flow works with **any EVM-compatible network** — users do not need to switch to a specific network before connecting. Polygon, mainnet, testnet, Arbitrum, etc. are all accepted. The `personal_sign` call is chain-agnostic.

### SIWE-lite Flow

AutoYield uses a simplified Sign-In with Ethereum (EIP-191) flow without external libraries:

```
1. POST /api/auth/challenge  { address }
   ← { nonce, message }           // nonce expires in 5 min

2. MetaMask: personal_sign(message, address)
   ← signature

3. POST /api/auth/verify  { address, signature }
   ← { token, user, agentWallet } // token = base64url(userId:ts:HMAC-SHA256)

4. All subsequent requests:
   Authorization: Bearer {token}   // 7-day TTL
```

### Session Tokens

Tokens are `base64url(userId:timestamp:HMAC-SHA256)` — no external JWT library required. Verified in `lib/auth.js` with `crypto.timingSafeEqual`.

### Per-User Agent Wallets

On first login, the system auto-generates a dedicated Ethereum wallet for the user:

- `lib/userWallet.js` — `createUserWallet(userId)`: generates random wallet, AES-256-CBC encrypts private key with `WALLET_ENCRYPTION_KEY`, stores in `agent_wallets` table
- `getUserSigner(userId)` — decrypts and returns `ethers.Wallet` for on-chain execution
- `getUserUsdcBalance(userId)` — reads USDC balance at the agent wallet address

> **⚠️ Custody model:** The server holds agent wallet private keys. Users should only deposit funds they trust to this automated agent.

### Auth Middleware

`withAuth(handler)` in `lib/auth.js` wraps any API handler to require a valid session:

```js
export default withAuth(async function handler(req, res) {
  const { userId } = req.session;
  // ...
});
```

### Per-User vs Global Fallback

All data endpoints detect the session automatically:

- **With `Authorization: Bearer {token}`** → per-user data from SQLite
- **Without token** → global JSON files (admin/legacy/single-user mode)

This means the system is fully backward-compatible — existing single-user setups continue to work without any auth.

### Auth API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/challenge` | `{ address }` → `{ nonce, message }` to sign |
| `POST` | `/api/auth/verify` | `{ address, signature }` → `{ token, user, agentWallet }` |
| `GET` | `/api/auth/me` | Returns current user info + agent wallet + USDC balance |

---

## 4. Protocol Adapter System

### Design Philosophy

Each protocol implements a **standard adapter interface**. The decision engine and executor work with any registered protocol — no hardcoded protocol names outside the adapters themselves.

### Adapter Interface

Every adapter in `lib/protocols/adapters/` must implement:

```js
{
  id: string,           // unique ID, e.g. 'aave'
  name: string,         // display name, e.g. 'AAVE V3'
  chain: string,        // chain ID, e.g. 'sepolia'
  color: string,        // hex color for UI
  website: string,      // protocol website
  description: string,  // short description
  category: string,     // 'lending' | 'lp' | 'vault'
  enabled: boolean,     // default enabled state

  getContractAddress(): string,
  async getAPR(): Promise<number>,           // returns APR as percentage
  async supply({ signer, usdcAddress, amount }): Promise<TxReceipt>,
  async withdraw({ signer, usdcAddress }): Promise<TxReceipt>,
}
```

### Registered Adapters

| ID | Name | Chain | Status | File |
|---|---|---|---|---|
| `aave` | AAVE V3 | Sepolia | Active (Phase 1) | `adapters/aave.js` |
| `compound` | Compound V3 | Sepolia | Active (Phase 1) | `adapters/compound.js` |
| `radiant` | Radiant Capital | Arbitrum | Inactive (Phase 2) | `adapters/radiant.js` |
| `morpho` | Morpho Blue | Base | Inactive (Phase 2) | `adapters/morpho.js` |

### Adding a New Protocol

1. Create `lib/protocols/adapters/myprotocol.js` implementing the interface above
2. Import and add to `ALL_ADAPTERS` in `lib/protocols/index.js`
3. Add env vars to `.env.local` (contract address, etc.)
4. Enable via the Admin Dashboard or `data/protocols.json`

### Protocol Registry (`lib/protocols/index.js`)

| Function | Description |
|---|---|
| `getAllProtocols()` | Returns all adapters with runtime overrides applied |
| `getEnabledProtocols()` | Returns only enabled protocols |
| `getProtocol(id)` | Returns a single protocol adapter by ID |
| `setProtocolEnabled(id, enabled)` | Persists enable/disable to `data/protocols.json` |
| `fetchAllAPRs()` | Fetches APRs from all enabled protocols concurrently |

---

## 5. Chain Configuration

Chain configs live in `lib/chains/configs.js`.

### Registered Chains

**Deposit-enabled (Phase 1 testnets):**

| ID | Name | Chain ID | Status | Env Var Prefix |
|---|---|---|---|---|
| `sepolia` | Ethereum Sepolia | 11155111 | **Enabled** | `RPC_URL` / `USDC_ADDRESS` |
| `baseSepolia` | Base Sepolia | 84532 | **Enabled** | `BASE_SEPOLIA_RPC_URL` / `BASE_SEPOLIA_USDC_ADDRESS` |
| `arbitrumSepolia` | Arbitrum Sepolia | 421614 | **Enabled** | `ARBITRUM_SEPOLIA_RPC_URL` / `ARBITRUM_SEPOLIA_USDC_ADDRESS` |

**Mainnets (Phase 2 — disabled):**

| ID | Name | Chain ID | Status |
|---|---|---|---|
| `ethereum` | Ethereum | 1 | Disabled |
| `base` | Base | 8453 | Disabled |
| `arbitrum` | Arbitrum One | 42161 | Disabled |
| `optimism` | Optimism | 10 | Disabled |

### Adding a New Chain

1. Add an entry to `CHAINS` in `lib/chains/configs.js`
2. Add the corresponding RPC URL env var
3. Create protocol adapters targeting that chain

---

## 6. Core Engine Modules

All core logic lives in `autoyield-agent/lib/`.

### Decision Engine (`lib/decisionEngine.js`)

The AI decision engine. Evaluates **all enabled protocols** dynamically — not just two.

**Input:** `{ state, aprSnapshot, history, rules, gasCostUsd }`

`aprSnapshot` format:
```json
{
  "aprs": { "aave": 4.2, "compound": 3.6 },
  "best": "aave",
  "bestAPR": 4.2,
  "timestamp": 1234567890
}
```

**6-Step Decision Process:**
1. **Target Selection** — find highest APR across all enabled protocols
2. **Capital Threshold** — verify balance justifies gas cost at current delta
3. **Annual Profitability** — projected gain must exceed expected annual gas cost
4. **Trend Analysis** — EMA delta, momentum, volatility, persistence scoring
5. **Cooldown Check** — enforce minimum time between rotations
6. **Safety Guards** — gas cap, max balance cap

**Output:** `{ action: 'ROTATE' | 'NOOP', from, to, deltaPct, emaDelta, confidenceScore, ... }`

### APR History (`lib/aprHistory.js`)

Maintains a rolling window of 24 snapshots (increased from 12 for multi-protocol).

**Schema (new format):**
```json
{
  "aprs": { "aave": 4.2, "compound": 3.6 },
  "best": "aave",
  "bestAPR": 4.2,
  "timestamp": 1234567890
}
```

**Backward compatible** — automatically migrates old `{ aaveAPR, compoundAPR }` snapshots.

**Key change:** `getDeltaHistory(history, currentProtocol)` now takes `currentProtocol` as a parameter. Delta is computed as `bestAPR - aprs[currentProtocol]` per snapshot, measuring the opportunity cost of staying in the current protocol.

### Executor (`lib/executor.js`)

Executes rotations using the protocol adapter registry. Adding a new protocol never requires changes to the executor.

```
executeRotation({ from, to, signer })
  → fromAdapter.withdraw({ signer, usdcAddress })
  → toAdapter.supply({ signer, usdcAddress, amount })
  → { withdrawTxHash, supplyTxHash, txHash, blockNumber, amountUsdc }
```

### APR Fetcher (`lib/aprFetcher.js`)

Thin wrapper over the protocol registry.

| Export | Description |
|---|---|
| `fetchAllAPRs()` | Primary — returns `{ aprs, best, bestAPR, timestamp }` |
| `fetchBothAPRs()` | Legacy wrapper — includes `aaveAPR`, `compoundAPR`, `delta` fields |
| `getAaveAPR()` | Single protocol getter |
| `getCompoundAPR()` | Single protocol getter |

### Gas Estimator (`lib/gasEstimator.js`)

Estimates rotation gas cost in USD using on-chain gas price + CoinGecko ETH/USD price.

### Agent Wallet (`lib/agentWallet.js`)

Global/legacy signer using `AGENT_PRIVATE_KEY` env var. Used as fallback when no user session is present (admin/single-user mode).

For multi-user mode, use `lib/userWallet.js` instead.

### User Wallet (`lib/userWallet.js`)

Per-user wallet management for multi-user mode.

| Export | Description |
|---|---|
| `createUserWallet(userId)` | Generate random wallet, encrypt key with AES-256-CBC, store in DB |
| `getUserSigner(userId, chainId?)` | Decrypt key, return `ethers.Wallet` connected to the appropriate RPC |
| `getUserUsdcBalance(userId, chainId?)` | Read USDC balance for user's agent wallet |
| `getProviderForChain(chainId)` | Returns `JsonRpcProvider` for a given chain using stored credentials |

### Database (`lib/db.js`)

SQLite via `better-sqlite3`. WAL mode enabled for concurrent read safety.

**Tables:**

| Table | Purpose |
|---|---|
| `users` | Registered user addresses |
| `agent_wallets` | Per-user agent wallet (address + AES-encrypted private key) |
| `user_rules` | Per-user decision rule overrides (JSON) |
| `user_state` | Per-user agent state (current protocol, last move, pending approval) |
| `user_history` | Per-user execution history |
| `auth_nonces` | One-time challenge nonces with 5-min TTL |
| `scheduler_lock` | Per-user lock to prevent overlapping scheduler runs |

### Telegram Bot (`lib/telegramBot.js`)

Sends approval messages with inline Approve/Reject buttons. Handles callback queries from webhook.

---

## 7. 24/7 Scheduler

### Overview

The scheduler runs the decision engine for every registered user every **5 minutes**, automatically. It starts on server boot via the Next.js instrumentation hook.

### Files

| File | Description |
|---|---|
| `lib/scheduler.js` | Core scheduler logic |
| `pages/api/cron.js` | HTTP endpoint for external cron triggers |
| `instrumentation.js` | Next.js boot hook: calls `startScheduler()` |
| `next.config.mjs` | `experimental.instrumentationHook: true` |

### How It Works

```
Server starts
  → instrumentation.js register()
  → startScheduler()
  → setInterval(5 min)
    → runAllUsers()
      → for each user in DB:
          acquireSchedulerLock(userId, ttl=4min)  // prevent overlap
          getUserSigner(userId)
          fetchAllAPRs()
          runDecisionEngine(...)
          if ROTATE:
            executionMode === 'auto'    → executeRotation() immediately
            executionMode === 'telegram_approval' → sendApprovalMessage()
          releaseSchedulerLock(userId)
```

### External Cron

`POST /api/cron` can also be called by external services (Vercel Cron, cron-job.org):

```bash
# Trigger all users
curl -X POST https://your-app.com/api/cron \
  -H "x-cron-secret: your-cron-secret"

# Trigger specific user
curl -X POST "https://your-app.com/api/cron?userId=1" \
  -H "x-cron-secret: your-cron-secret"
```

Set `CRON_SECRET` in `.env.local` to protect this endpoint. If not set, it is open (dev-only).

---

## 8. API Reference

All state/rules/history endpoints detect the `Authorization: Bearer` header automatically and return per-user data when present, or global data otherwise.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/challenge` | `{ address }` → `{ nonce, message }` — request a sign challenge |
| `POST` | `/api/auth/verify` | `{ address, signature }` → `{ token, user, agentWallet }` — verify signature and get session |
| `GET` | `/api/auth/me` | Returns current user + agent wallet + USDC balance (requires Bearer token) |

### Decision & Execution

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/check` | Run decision engine for current user — fetches APRs, evaluates, sets pending if ROTATE |
| `POST` | `/api/approve` | `{ approved: bool }` — execute or reject pending approval |
| `GET` | `/api/apr` | Fetch current APRs from all enabled protocols, append to history |

### State & Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Per-user agent state + agent wallet address + USDC balance |
| `GET/PUT` | `/api/rules` | Read or update decision rules (per-user when authed) |
| `GET` | `/api/history` | Execution log (per-user when authed) |

### Registry

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/protocols` | List all protocols with enabled status |
| `PATCH` | `/api/protocols` | `{ id, enabled: bool }` — toggle a protocol |
| `GET` | `/api/chains` | List all chains with RPC config status |

### Credentials

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/credentials` | List all known credential keys with value, source (`file`/`env`/`unset`), and placeholder |
| `PUT` | `/api/credentials` | `{ KEY: value, ... }` — save credentials to `data/credentials.json`. Pass `""` to clear |

### Scheduler / Cron

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cron` | Trigger check for all users. Protected by `x-cron-secret` header |
| `POST` | `/api/cron?userId=X` | Trigger check for a specific user |

### Telegram

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT/DELETE` | `/api/telegram/config` | Manage bot token and chat ID |
| `GET` | `/api/telegram/status` | Check Telegram config and webhook URL |
| `POST` | `/api/telegram/test` | Send test message |
| `POST` | `/api/telegram/webhook` | Receive callback queries (approve/reject). Validates `x-telegram-bot-api-secret-token` header and sender chatId |

---

## 9. User Interface

### Landing Page (`pages/index.js`)

Marketing page with hero, stats, features, "How It Works", and roadmap timeline. Link to `/dapp`.

### DApp Dashboard (`pages/dapp.js`)

Main operational interface. Requires wallet authentication.

**Auth flow (unauthenticated state):**
- "Connect with MetaMask" button triggers SIWE: `eth_requestAccounts` → `/api/auth/challenge` → `personal_sign` → `/api/auth/verify`
- Session token stored in `localStorage.__session`
- Agent wallet address shown in a deposit banner on first login

**Connected state panels:**
- Header: user address badge, Disconnect button, Admin link
- Deposit banner: agent wallet address + "Deposit USDC here" hint
- `AgentWalletPanel` — agent wallet address, USDC balance, active protocol
- `APRPanel` — live APRs for all enabled protocols with BEST badge, EMA, momentum, confidence
- `DecisionPanel` — latest decision with run trigger
- `ApprovalPanel` — approve/reject pending rotations
- `ProtocolPanel` — all protocol registry entries with live APRs
- `RulesPanel` — editable decision rules (per-user)
- `TelegramPanel` — bot configuration
- `HistoryTable` — execution log (per-user)

**All API calls include `Authorization: Bearer {token}` header.**

### Admin Dashboard (`pages/admin.js`)

Full management and observability interface at `/admin`.

**Sections:**
1. **System Overview** — 6-stat grid: wallet, balance, active protocol, rotation count, volume, execution mode
2. **Live APR Snapshot** — visual APR cards per protocol, manual refresh button
3. **Protocol Registry** — `ProtocolPanel` with enable/disable toggles
4. **Chain Registry** — all chains with status (live/upcoming), RPC config indicator, phase
5. **API Credentials** — per-chain RPC URL + USDC address, per-protocol contract address. Each card shows source badge (`saved` / `env` / `not set`) and a Save button. Saved values are persisted to `data/credentials.json` and override env vars at runtime without server restart.
6. **Decision Rules** — `RulesPanel` for live rule editing
7. **Full Execution Log** — complete `HistoryTable`

---

## 10. Data Layer

The data layer is split into two tiers:

### SQLite Database (`data/autoyield.db`)

Per-user data. Handles multi-user, concurrency-safe (WAL mode), and persists across deploys.

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id`, `address` | Registered wallet addresses |
| `agent_wallets` | `user_id`, `address`, `encrypted_key` | Per-user agent wallet (AES-256-CBC encrypted key) |
| `user_rules` | `user_id`, `rules` (JSON) | Per-user decision rule overrides |
| `user_state` | `user_id`, `current_protocol`, `last_move_timestamp`, `pending_approval` | Per-user agent state |
| `user_history` | `user_id`, `action`, `details` (JSON), `executed_at` | Per-user execution history |
| `auth_nonces` | `address`, `nonce`, `expires_at` | One-time sign challenges (5-min TTL) |
| `scheduler_lock` | `user_id`, `locked_at` | Prevents overlapping scheduler runs per user |

### JSON Files (`data/`)

Global/admin data. Used as fallback when no user session is present.

| File | Schema | Description |
|---|---|---|
| `state.json` | `{ currentProtocol, lastMoveTimestamp, pendingApproval }` | Global agent state (single-user/admin mode) |
| `rules.json` | `{ minDeltaPct, confidenceThreshold, cooldownMinutes, ... }` | Global decision parameters |
| `aprHistory.json` | `[{ aprs: {...}, best, bestAPR, timestamp }]` | Rolling 24-snapshot APR history |
| `history.json` | `[{ action, from, to, deltaPct, txHash, ... }]` | Global execution log |
| `protocols.json` | `{ [id]: { enabled: bool } }` | Runtime protocol overrides |
| `telegram.json` | `{ botToken, chatId }` | Telegram credentials |
| `credentials.json` | `{ KEY: value, ... }` | RPC URLs and contract addresses. Overrides env vars. Does **not** store `AGENT_PRIVATE_KEY`. |

---

## 11. Environment Variables

> **Note:** Chain/protocol contract addresses can also be configured via the Admin Dashboard → **API Credentials** section. Values saved there are stored in `data/credentials.json` and override env vars at runtime without a server restart.

```env
# ── Auth & Security (NEW in v3.0) ────────────────────────────────────────────

# Secret for signing session tokens (HMAC-SHA256). Change in production!
SESSION_SECRET=your-random-64-char-secret-here

# AES-256-CBC key for encrypting agent wallet private keys in DB. Exactly 32 chars!
WALLET_ENCRYPTION_KEY=exactly-32-chars-encryption-key!

# Protects POST /api/cron — pass as x-cron-secret header
CRON_SECRET=your-cron-secret

# Optional: Telegram webhook secret token (set via Telegram setWebhook API)
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret


# ── Global Agent (legacy/admin mode) ─────────────────────────────────────────

# Single-user global agent key (fallback when no user session present)
AGENT_PRIVATE_KEY=0x...


# ── Chain & Protocol Addresses (configurable via Admin UI) ───────────────────


# ── Testnet Chains (deposit-enabled, Phase 1) ─────────────────────────────────

# Ethereum Sepolia
RPC_URL=https://...                          # Sepolia RPC URL
USDC_ADDRESS=0x...                            # USDC on Sepolia
AAVE_POOL_ADDRESS=0x...                       # AAVE V3 Pool on Sepolia
COMPOUND_COMET_ADDRESS=0x...                  # Compound Comet on Sepolia

# Base Sepolia
BASE_SEPOLIA_RPC_URL=https://...
BASE_SEPOLIA_USDC_ADDRESS=0x...

# Arbitrum Sepolia
ARBITRUM_SEPOLIA_RPC_URL=https://...
ARBITRUM_SEPOLIA_USDC_ADDRESS=0x...

# Optional — Telegram integration
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# ── Mainnets (Phase 2 — disabled) ────────────────────────────────────────────
# Ethereum mainnet
ETHEREUM_RPC_URL=https://...
ETHEREUM_USDC_ADDRESS=0x...

# Arbitrum One mainnet
ARBITRUM_RPC_URL=https://...
ARBITRUM_USDC_ADDRESS=0x...
RADIANT_POOL_ADDRESS=0x...

# Base mainnet
BASE_RPC_URL=https://...
BASE_USDC_ADDRESS=0x...
MORPHO_POOL_ADDRESS=0x...

# Optimism mainnet
OPTIMISM_RPC_URL=https://...
OPTIMISM_USDC_ADDRESS=0x...
```

---

## 12. Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1** | Live | MVP on Sepolia. AAVE + Compound. Full AI decision engine. Telegram alerts. |
| **Phase 2** | Planned | Mainnet: Arbitrum, Optimism, Base. Radiant, Morpho adapters. Gas-aware multi-chain routing. |
| **Phase 3** | Planned | ML-based APR forecasting. Uniswap V3 LP strategies. Leveraged yield. |
| **Phase 4** | Planned | `$AYD` governance token. DAO-controlled parameters. Decentralized agent network. |

---

## 13. Getting Started

```bash
# 1. Navigate to project
cd AutoYield-Agent/autoyield-agent

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Minimum required:
#   SESSION_SECRET=<random 64-char string>
#   WALLET_ENCRYPTION_KEY=<exactly 32 chars>
#   RPC_URL=https://sepolia.infura.io/v3/...
#   USDC_ADDRESS=0x...
#   AAVE_POOL_ADDRESS=0x...
#   COMPOUND_COMET_ADDRESS=0x...

# 4. Start dev server
npm run dev
```

The SQLite database (`data/autoyield.db`) is created automatically on first run.

**Routes:**
- `http://localhost:3000` — Landing page
- `http://localhost:3000/dapp` — DApp dashboard (wallet connect required)
- `http://localhost:3000/admin` — Admin dashboard

**First-time user flow:**
1. Open `/dapp`
2. Click **Connect with MetaMask**
3. Sign the challenge message
4. Copy your **Agent Wallet address** from the deposit banner
5. Send USDC to that address (Sepolia USDC from a faucet)
6. Click **Run Check** to trigger the decision engine
7. Approve or reject via UI or Telegram

---

## 14. Changelog

### 2026-02-24 — v3.1: Any-EVM Sign-In + Testnet Multi-Chain Deposits

**Bug fix: "Signature does not match address" (`lib/auth.js`)**
- `buildSignMessage()` previously included `Issued: ${new Date().toISOString()}` — this timestamp was generated at challenge creation time (T1) and again at verification time (T2), producing two different messages. `ethers.verifyMessage()` recovered the wrong address, causing auth to fail for wallets on any network (e.g. Polygon).
- **Fix:** removed the `Issued:` line entirely. The nonce (random 16-byte hex, 5-min TTL) already provides replay protection.

**Any-EVM sign-in**
- Wallet connection and authentication now work from **any EVM-compatible network** — no network switching required. Polygon, Ethereum mainnet, testnets, Arbitrum, etc. are all accepted.

**Multi-chain testnet deposits (`lib/chains/configs.js`)**
- Added `baseSepolia` — Base Sepolia testnet (chain ID 84532). Env vars: `BASE_SEPOLIA_RPC_URL`, `BASE_SEPOLIA_USDC_ADDRESS`.
- Added `arbitrumSepolia` — Arbitrum Sepolia testnet (chain ID 421614). Env vars: `ARBITRUM_SEPOLIA_RPC_URL`, `ARBITRUM_SEPOLIA_USDC_ADDRESS`.
- Re-enabled `sepolia` (Ethereum Sepolia) as the primary testnet.
- Added mainnet chain entries (`ethereum`, `base`, `arbitrum`, `optimism`) — all `enabled: false` for Phase 2.
- Removed the old single-mainnet `ethereum` and mainnet `base`/`arbitrum` that had been temporarily enabled.

**UI (`pages/dapp.js`)**
- Network badge updated to `"Testnet · ETH · Base · Arbitrum"`
- Deposit banner hint updated to `"← Deposit USDC here (Sepolia · Base Sepolia · Arbitrum Sepolia)"`
- Connect card description updated: "Sign in with any EVM wallet. Deposits supported on Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia."

**`lib/userWallet.js`**
- Default `chainId` parameter on `createUserWallet`, `getUserSigner`, `getUserUsdcBalance`, `getProviderForChain` is `'sepolia'` (primary testnet).

---

### 2026-02-24 — v3.0: Multi-User Foundation, SQLite DB, SIWE Auth, 24/7 Scheduler

**New: Multi-User Architecture**
- `lib/db.js` — SQLite database via `better-sqlite3`. 7 tables: `users`, `agent_wallets`, `user_rules`, `user_state`, `user_history`, `auth_nonces`, `scheduler_lock`. WAL mode for concurrent access.
- `lib/auth.js` — SIWE-lite: `createChallenge()`, `verifyAndLogin()`, `verifySessionToken()` (HMAC-SHA256, 7-day TTL), `withAuth()` middleware
- `lib/userWallet.js` — per-user agent wallet: `createUserWallet()` (AES-256-CBC encrypted key storage), `getUserSigner()`, `getUserUsdcBalance()`
- `pages/api/auth/challenge.js` — `POST /api/auth/challenge`
- `pages/api/auth/verify.js` — `POST /api/auth/verify` (auto-creates agent wallet on first login)
- `pages/api/auth/me.js` — `GET /api/auth/me`
- `pages/api/state.js` — added `readStateForUser()`, `writeStateForUser()` — DB when authed, JSON fallback
- `pages/api/rules.js` — added `readRulesForUser()` — DB when authed, JSON fallback
- `pages/api/history.js` — added `appendHistoryForUser()`, `readHistoryForUser()` — DB when authed
- `pages/api/check.js` — per-user signer/balance/state/rules; attaches `expiresAt` (now+30min) to pending decisions
- `pages/api/approve.js` — per-user signer; checks `expiresAt` before executing

**New: 24/7 Scheduler**
- `lib/scheduler.js` — `startScheduler()` (5-min `setInterval`), `runAllUsers()`, `runCheckForUser(userId)`. Uses `scheduler_lock` to prevent overlapping runs.
- `pages/api/cron.js` — `POST /api/cron` — external cron endpoint, protected by `CRON_SECRET`
- `instrumentation.js` — Next.js server boot hook calling `startScheduler()`
- `next.config.mjs` — `experimental.instrumentationHook: true`

**Bug fix: Compound V3 withdraw (`lib/protocols/adapters/compound.js`)**
- **Before:** `withdraw()` called `erc20.balanceOf(agent)` — returns ~0 when funds are in Compound
- **After:** `withdraw()` calls `comet.balanceOf(agent)` — reads actual supply position
- Added `'function balanceOf(address account) view returns (uint256)'` to `COMET_ABI`
- Throws descriptive error if position is 0 instead of silently withdrawing nothing

**Security: Telegram webhook hardening**
- `pages/api/telegram/webhook.js` — validates `x-telegram-bot-api-secret-token` header (optional, set `TELEGRAM_WEBHOOK_SECRET`)
- Verifies `callbackQuery.from.id === configuredChatId` — prevents unauthorized users from approving
- Checks `decision.expiresAt` — rejects approvals older than 30 minutes
- Clears expired pending decisions automatically

**DApp UI: Wallet connect + auth flow (`pages/dapp.js`)**
- Unauthenticated state: "Connect with MetaMask" screen with custody model warning
- Auth: `eth_requestAccounts` → challenge → `personal_sign` → verify → session token in `localStorage`
- Connected state: shows user address badge, Disconnect button, agent wallet deposit banner
- All API calls include `Authorization: Bearer {token}` header

---

### 2026-02-24 — v2.0.2: API Credentials Manager

**New: Runtime credential management via Admin Dashboard**
- `lib/credentials.js` — runtime resolver: `getCredential(key)` checks `data/credentials.json` first, falls back to `process.env`. `saveCredentials(updates)`, `getCredentialStatus()`.
- `data/credentials.json` — persistent store for RPC URLs and contract addresses. `AGENT_PRIVATE_KEY` intentionally excluded.
- `pages/api/credentials.js` — `GET /api/credentials` (list all keys + source), `PUT /api/credentials` (save updates, whitelisted keys only).
- `lib/agentWallet.js` — uses `getCredential('RPC_URL')` and `getCredential('USDC_ADDRESS')`.
- `lib/protocols/adapters/aave.js` — uses `getCredential('AAVE_POOL_ADDRESS')` and `getCredential('USDC_ADDRESS')`.
- `lib/protocols/adapters/compound.js` — uses `getCredential('COMPOUND_COMET_ADDRESS')`.
- `pages/admin.js` — new **API Credentials** section with `CredentialCard` components:
  - **Chain RPC & USDC**: Sepolia, Arbitrum, Optimism, Base cards
  - **Protocol Contract Addresses**: Aave, Compound, Radiant, Morpho cards
  - Per-card source badge (`● saved` / `● env` / `● not set`), Ready/Incomplete status, individual Save button

---

### 2026-02-24 — v2.0.1: Merge & Conflict Resolution

**Resolved merge conflicts between multi-protocol branch and UI redesign on main:**
- Preserved `APRPanel.jsx` multi-protocol logic (`PROTOCOL_COLORS`, dynamic `aprEntries` mapping, BEST badge)
- Preserved `dapp.js` full layout: `TelegramPanel`, `ProtocolPanel`, admin header link
- Synced `aprHistory.json` APR data from main (replaces empty array)
- Incorporated `styles/Dapp.module.css` glassmorphism CSS module (new file from main, no conflict)
- Synced redesigned components from main: `AgentWalletPanel`, `ApprovalPanel`, `DecisionPanel`, `HistoryTable`, `RulesPanel`

---

### 2026-02-23 — v2.0: Multi-Protocol Architecture

**New: Protocol Adapter System**
- `lib/protocols/adapters/aave.js` — AAVE V3 adapter (extracted from aprFetcher)
- `lib/protocols/adapters/compound.js` — Compound V3 adapter
- `lib/protocols/adapters/radiant.js` — Radiant Capital stub (Phase 2, Arbitrum)
- `lib/protocols/adapters/morpho.js` — Morpho Blue stub (Phase 2, Base)
- `lib/protocols/index.js` — Protocol registry: `getAllProtocols`, `fetchAllAPRs`, `setProtocolEnabled`
- `data/protocols.json` — Runtime protocol overrides

**New: Chain Configuration**
- `lib/chains/configs.js` — Chain registry: Sepolia (live), Arbitrum/Optimism/Base (Phase 2)

**New: API Endpoints**
- `GET /api/protocols` — List all protocols
- `PATCH /api/protocols` — Enable/disable a protocol
- `GET /api/chains` — List all chains with RPC config status

**New: UI**
- `components/ProtocolPanel.jsx` — Protocol registry table with optional enable/disable toggles
- `pages/admin.js` — Full admin dashboard (system overview, protocol/chain registry, rules, logs)
- Updated `components/APRPanel.jsx` — Now shows N protocols dynamically with BEST badge
- Updated `pages/dapp.js` — Added ProtocolPanel, Admin link in header

**Refactored: Core Logic**
- `lib/aprHistory.js` — New snapshot schema `{ aprs: {...}, best, bestAPR }`. `getDeltaHistory` now takes `currentProtocol` param. Backward compatible with old format. Rolling window increased from 12 → 24.
- `lib/decisionEngine.js` — N-protocol support. Compares all enabled protocols, not hardcoded aave/compound. Added `minDeltaPct` pre-check.
- `lib/executor.js` — Uses protocol adapter registry instead of hardcoded if/else chains.
- `lib/aprFetcher.js` — Thin wrapper over protocol registry. Legacy `fetchBothAPRs` kept for compatibility.
- `pages/api/apr.js` — Uses `fetchAllAPRs()`.
- `pages/api/check.js` — Uses `fetchAllAPRs()`.

### 2026-02-22 — v1.1: Landing Page & Roadmap

- Separated Landing page (`pages/index.js`) from DApp dashboard (`pages/dapp.js`)
- Added vertical timeline Roadmap section
- Added `styles/Landing.module.css`, `styles/Roadmap.module.css`
- Added `DOCUMENTATION.md`
- User-configurable Telegram bot via UI

### 2026-02-21 — v1.0: MVP

- Complete AutoYield Agent DApp implementation
- AAVE + Compound APR comparison
- 6-step decision engine (EMA, momentum, confidence, cooldown, safety)
- Telegram bot integration with approve/reject buttons
- Agent wallet, gas estimator, executor
- DApp dashboard with all control panels
