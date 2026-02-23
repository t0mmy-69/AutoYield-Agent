# AutoYield Agent — System Documentation

Welcome to the comprehensive system documentation for **AutoYield Agent**. This document serves as the master reference for the project's architecture, core modules, API surface, user interface, and integration points.

> **Last updated:** 2026-02-23
> **Version:** 2.0 — Multi-Protocol Architecture

---

## Table of Contents

1. [Introduction & Vision](#1-introduction--vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Protocol Adapter System](#3-protocol-adapter-system)
4. [Chain Configuration](#4-chain-configuration)
5. [Core Engine Modules](#5-core-engine-modules)
6. [API Reference](#6-api-reference)
7. [User Interface](#7-user-interface)
8. [Data Layer](#8-data-layer)
9. [Environment Variables](#9-environment-variables)
10. [Roadmap](#10-roadmap)
11. [Getting Started](#11-getting-started)
12. [Changelog](#12-changelog)

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
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  API Routes (pages/api/)                         │
│  /check  /approve  /apr  /state  /rules  /history               │
│  /protocols  /chains  /telegram/*                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Core Engine (lib/)                            │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐                    │
│  │ Protocol Registry│   │  Chain Registry   │                   │
│  │ lib/protocols/  │   │  lib/chains/      │                    │
│  │  adapters/      │   │  configs.js       │                    │
│  │   aave.js       │   └──────────────────┘                    │
│  │   compound.js   │                                             │
│  │   radiant.js    │   ┌──────────────────┐                    │
│  │   morpho.js     │   │  Decision Engine  │                    │
│  └─────────────────┘   │  decisionEngine.js│                    │
│                         └──────────────────┘                    │
│  ┌─────────────────┐   ┌──────────────────┐                    │
│  │  APR History    │   │    Executor       │                    │
│  │  aprHistory.js  │   │    executor.js    │                    │
│  └─────────────────┘   └──────────────────┘                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Data Layer (data/)                            │
│  state.json  │  rules.json  │  aprHistory.json  │  history.json │
│  protocols.json                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** Next.js, React, CSS Modules
- **Backend:** Next.js API routes, Node.js
- **Blockchain:** ethers.js v6
- **Notifications:** Telegram Bot API
- **Network:** Sepolia Testnet (Phase 1)

---

## 3. Protocol Adapter System

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

## 4. Chain Configuration

Chain configs live in `lib/chains/configs.js`.

### Registered Chains

| ID | Name | Chain ID | Status | Phase |
|---|---|---|---|---|
| `sepolia` | Sepolia Testnet | 11155111 | Enabled | 1 |
| `arbitrum` | Arbitrum One | 42161 | Disabled | 2 |
| `optimism` | Optimism | 10 | Disabled | 2 |
| `base` | Base | 8453 | Disabled | 2 |

### Adding a New Chain

1. Add an entry to `CHAINS` in `lib/chains/configs.js`
2. Add the corresponding RPC URL env var
3. Create protocol adapters targeting that chain

---

## 5. Core Engine Modules

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

Manages provider, signer (from `AGENT_PRIVATE_KEY`), USDC balance reads, and ERC20 approvals.

### Telegram Bot (`lib/telegramBot.js`)

Sends approval messages with inline Approve/Reject buttons. Handles callback queries from webhook.

---

## 6. API Reference

### Decision & Execution

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/check` | Run decision engine — fetches all APRs, evaluates, stores pending if ROTATE |
| `POST` | `/api/approve` | `{ approved: bool }` — execute or reject pending approval |
| `GET` | `/api/apr` | Fetch current APRs from all enabled protocols, append to history |

### State & Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | Current agent state + live USDC balance |
| `GET/PUT` | `/api/rules` | Read or update decision rules |
| `GET` | `/api/history` | Full execution log |

### Registry

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/protocols` | List all protocols with enabled status |
| `PATCH` | `/api/protocols` | `{ id, enabled: bool }` — toggle a protocol |
| `GET` | `/api/chains` | List all chains with RPC config status |

### Telegram

| Method | Endpoint | Description |
|---|---|---|
| `GET/PUT/DELETE` | `/api/telegram/config` | Manage bot token and chat ID |
| `GET` | `/api/telegram/status` | Check Telegram config and webhook URL |
| `POST` | `/api/telegram/test` | Send test message |
| `POST` | `/api/telegram/webhook` | Receive callback queries (approve/reject) |

---

## 7. User Interface

### Landing Page (`pages/index.js`)

Marketing page with hero, stats, features, "How It Works", and roadmap timeline. Link to `/dapp`.

### DApp Dashboard (`pages/dapp.js`)

Main operational interface. Polls state every 30 seconds.

**Panels:**
- `AgentWalletPanel` — wallet address, USDC balance, active protocol
- `APRPanel` — live APRs for all enabled protocols with BEST badge, EMA, momentum, confidence
- `DecisionPanel` — latest decision with run trigger
- `ApprovalPanel` — approve/reject pending rotations
- `ProtocolPanel` — all protocol registry entries with live APRs (read-only in dapp)
- `RulesPanel` — editable decision rules
- `TelegramPanel` — bot configuration
- `HistoryTable` — execution log

**Navigation:** Header includes an "Admin" link to `/admin`.

### Admin Dashboard (`pages/admin.js`)

Full management and observability interface at `/admin`.

**Sections:**
1. **System Overview** — 6-stat grid: wallet, balance, active protocol, rotation count, volume, execution mode
2. **Live APR Snapshot** — visual APR cards per protocol, manual refresh button
3. **Protocol Registry** — `ProtocolPanel` with enable/disable toggles
4. **Chain Registry** — all chains with status (live/upcoming), RPC config indicator, phase
5. **Decision Rules** — `RulesPanel` for live rule editing
6. **Full Execution Log** — complete `HistoryTable`

---

## 8. Data Layer

All state is persisted as JSON files in `autoyield-agent/data/`.

| File | Schema | Description |
|---|---|---|
| `state.json` | `{ currentProtocol, lastMoveTimestamp, pendingApproval }` | Active agent state |
| `rules.json` | `{ minDeltaPct, confidenceThreshold, cooldownMinutes, ... }` | Decision parameters |
| `aprHistory.json` | `[{ aprs: {...}, best, bestAPR, timestamp }]` | Rolling 24-snapshot APR history |
| `history.json` | `[{ action, from, to, deltaPct, txHash, ... }]` | All decisions and rotations |
| `protocols.json` | `{ [id]: { enabled: bool } }` | Runtime protocol overrides (empty = use adapter defaults) |
| `telegram.json` | `{ botToken, chatId }` | Telegram credentials |

---

## 9. Environment Variables

```env
# Required for Phase 1 (Sepolia)
AGENT_PRIVATE_KEY=0x...          # Agent wallet private key
RPC_URL=https://...              # Sepolia RPC URL
USDC_ADDRESS=0x...               # USDC contract on Sepolia
AAVE_POOL_ADDRESS=0x...          # AAVE V3 Pool on Sepolia
COMPOUND_COMET_ADDRESS=0x...     # Compound Comet on Sepolia

# Optional — Telegram integration
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Phase 2 — Arbitrum (not yet active)
ARBITRUM_RPC_URL=https://...
ARBITRUM_USDC_ADDRESS=0x...
RADIANT_POOL_ADDRESS=0x...

# Phase 2 — Base (not yet active)
BASE_RPC_URL=https://...
BASE_USDC_ADDRESS=0x...
MORPHO_POOL_ADDRESS=0x...

# Phase 2 — Optimism (not yet active)
OPTIMISM_RPC_URL=https://...
OPTIMISM_USDC_ADDRESS=0x...
```

---

## 10. Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1** | Live | MVP on Sepolia. AAVE + Compound. Full AI decision engine. Telegram alerts. |
| **Phase 2** | Planned | Mainnet: Arbitrum, Optimism, Base. Radiant, Morpho adapters. Gas-aware multi-chain routing. |
| **Phase 3** | Planned | ML-based APR forecasting. Uniswap V3 LP strategies. Leveraged yield. |
| **Phase 4** | Planned | `$AYD` governance token. DAO-controlled parameters. Decentralized agent network. |

---

## 11. Getting Started

```bash
# 1. Navigate to project
cd AutoYield-Agent/autoyield-agent

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Fill in AGENT_PRIVATE_KEY, RPC_URL, contract addresses

# 4. Start dev server
npm run dev
```

**Routes:**
- `http://localhost:3000` — Landing page
- `http://localhost:3000/dapp` — DApp dashboard
- `http://localhost:3000/admin` — Admin dashboard

---

## 12. Changelog

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
