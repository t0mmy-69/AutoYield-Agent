# AutoYield Agent — Product Presentation
## Complete Reference for Judges & Reviewers

> Version 3.4 · Branch `claude/review-autoyield-spec-TLo9m` · Last updated: 2026-02-27

---

# TABLE OF CONTENTS

1. [One-Line Pitch](#1-one-line-pitch)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Target User](#4-target-user)
5. [Competitive Positioning](#5-competitive-positioning)
6. [Product Features (Full)](#6-product-features-full)
7. [Technical Architecture](#7-technical-architecture)
8. [Decision Engine — Deep Dive](#8-decision-engine--deep-dive)
9. [AI Layer](#9-ai-layer)
10. [Security Model](#10-security-model)
11. [Business Math & Scenario Analysis](#11-business-math--scenario-analysis)
12. [Business Model](#12-business-model)
13. [Roadmap](#13-roadmap)
14. [Demo Script (3 Minutes)](#14-demo-script-3-minutes)
15. [Q&A Preparation](#15-qa-preparation)

---

# 1. ONE-LINE PITCH

> **AutoYield Agent is a non-custodial DeFi yield optimizer that acts as your personal on-chain financial agent — monitoring lending protocol rates 24/7, and only moving your money when the math actually justifies it.**

---

# 2. PROBLEM STATEMENT

## The Real Problem Is Not Finding Yield — It's Avoiding Bad Decisions

Every DeFi user with stablecoins faces the same three-way dilemma:

### Problem A — Manual Tracking Is Impossible at Scale
Aave and Compound APRs change continuously, driven by real-time supply/demand. A user who checks rates once a day misses windows that may last only hours. A user who checks constantly wastes time. No human can monitor N protocols across M chains around the clock.

### Problem B — Naive Automation Destroys Capital
A simple bot that rotates every time Compound beats Aave by any margin is worse than doing nothing. Here's the math:

```
Balance:     $1,000
Delta:       0.3% (Compound > Aave by 0.3 percentage points)
Annual gain: $1,000 × 0.003 = $3.00/year
Gas (L2):    $0.30/rotation × 365 rotations = $109.50/year

Net result:  -$106.50/year
```

The bot rotated every day and **destroyed the user's capital**. This is not a hypothetical — it is exactly what unsophisticated yield bots do. AutoYield would output `NOOP` in this case. Every time.

### Problem C — Existing Vault Solutions Require Giving Up Custody and Transparency

Yearn Finance, Beefy, and similar protocols pool your funds into a shared vault. You receive vault shares (yTokens) instead of USDC. Your money is no longer yours in the traditional sense. Strategy changes happen without your knowledge. Management fees (2% annual) and performance fees (20% of profits) silently compound against you.

For users who care about:
- Knowing where their USDC is at all times
- Seeing the reasoning behind every decision
- Approving moves before they execute
- Paying zero management fees

...vault protocols are the wrong product.

---

# 3. SOLUTION OVERVIEW

AutoYield Agent solves all three problems simultaneously:

| Problem | AutoYield's Answer |
|---|---|
| Manual tracking impossible | 24/7 scheduler monitors every 5 minutes, automatically |
| Naive bots destroy capital | 6-layer decision engine only rotates when economics are provably justified |
| Vaults = loss of custody | Non-custodial agent wallet — your keys, your USDC, always |

## What AutoYield Is

A **per-user AI wallet agent** that:
1. Continuously monitors lending protocol APRs across multiple chains
2. Applies a capital-aware, signal-quality-scored decision engine
3. Only executes a rotation when projected annual gain > expected annual gas cost AND the signal has proven statistically stable
4. Shows you exactly why it did or didn't move, in plain English
5. Asks for your approval before executing — via Telegram or UI — unless you've set it to auto

## What AutoYield Is NOT

- Not a vault (no pooled capital)
- Not a bridge (no cross-chain swaps)
- Not a yield aggregator charging management fees
- Not a black box making decisions you cannot see or override

---

# 4. TARGET USER

## Primary User Profile

| Attribute | Detail |
|---|---|
| **Capital range** | $500 – $20,000 USDC |
| **DeFi literacy** | Intermediate — knows Aave/Compound, has MetaMask |
| **Pain point** | Wants yield optimization but doesn't trust fully automated vaults |
| **Behavior** | Checks rates occasionally but inconsistently; not able to monitor 24/7 |
| **Preference** | Wants to approve or at least see decisions before they execute |

## Secondary User Profile

| Attribute | Detail |
|---|---|
| **Capital range** | $20,000+ |
| **DeFi literacy** | Advanced |
| **Pain point** | Managing multiple positions across chains manually is time-consuming |
| **Use case** | Uses AutoYield in auto mode as a hands-off L2 yield optimizer |

## User Profile — What They Are NOT

AutoYield does not serve:
- Users who want maximum yield at any cost (use Yearn)
- Users with very small balances ($100–$200) — gas economics are unfavorable even on L2
- Users who want leveraged yield farming (Phase 3 roadmap item)

---

# 5. COMPETITIVE POSITIONING

## Market Landscape

| Protocol | Type | Custody | Fees | Transparency | User Control |
|---|---|---|---|---|---|
| **Yearn Finance** | Vault aggregator | Non-custodial (pooled) | 2% mgmt + 20% perf | Low — strategy is on-chain code | None |
| **Beefy Finance** | Vault autocompounder | Non-custodial (pooled) | 0.1–0.5% withdrawal | Low | None |
| **Idle Finance** | Yield optimizer | Non-custodial (pooled) | Performance fee | Medium | Limited |
| **Manual DeFi** | Self-managed | Full custody | Gas only | Full | Full |
| **AutoYield Agent** | AI wallet agent | Full custody (isolated) | Gas only on moves | Full — every decision explained | Complete |

## The Positioning Matrix

```
                        HIGH TRANSPARENCY
                               │
                               │   ◉ AutoYield
                               │      (our position)
                               │
  FULL                         │                         POOLED
  CUSTODY ─────────────────────┼───────────────────── VAULT
                               │
              Manual DeFi ◉    │    ◉ Yearn   ◉ Beefy
                               │
                        LOW TRANSPARENCY
```

AutoYield occupies the unique quadrant: **full custody + full transparency**. No other protocol is there.

## Honest Trade-Offs

AutoYield wins on:
- Zero management fees
- Full custody at all times
- Complete decision transparency
- Human-in-the-loop approval
- No smart contract pooling risk

AutoYield loses on:
- Protocol breadth (Yearn accesses 100+ strategies; AutoYield currently: 4 protocols)
- Maximum theoretical yield (vault compounding strategies can outperform)
- Capital efficiency (idle USDC in agent wallet earns nothing when not deployed)

**This is intentional.** AutoYield is not competing for the same user as Yearn. It is a different product for a different user.

## Fee Comparison — The Concrete Numbers

**On $5,000 earning 5% APY over 1 year:**

| Protocol | Management Fee | Performance Fee | Total Cost | Net Yield |
|---|---|---|---|---|
| Yearn | $100 | $50 (20% of $250) | **$150** | $100 |
| Beefy | $0 | $12.50 (0.5% of $2,500 deposits) | **$12.50** | $237.50 |
| AutoYield | $0 | $0 | **$1.20 (4 rotations × $0.30)** | $248.80 |

AutoYield's cost is **125× cheaper than Yearn** on this example.

---

# 6. PRODUCT FEATURES (FULL)

## 6.1 Per-User Agent Wallet

Every user who connects their MetaMask gets an isolated, dedicated Ethereum wallet created automatically on first login. This agent wallet:

- Is unique to that user — no pooling, no shared state
- Holds the user's USDC on their behalf
- Has its private key AES-256-CBC encrypted and stored in the database
- Never shares funds or exposure with any other user

**Deposit flow:** User sends USDC from their main MetaMask wallet to their agent wallet address. This is a standard ERC-20 transfer — no smart contracts, no approvals beyond the transfer itself.

**Withdraw flow:** User clicks Withdraw in the UI → specifies amount → agent wallet signs a USDC transfer back to the user's main wallet. Instant, no delays.

## 6.2 Any-EVM Sign-In (SIWE-lite)

Users sign in with MetaMask using a EIP-191 `personal_sign` challenge. The sign-in works from **any EVM-compatible network** — Ethereum mainnet, Polygon, Arbitrum, Optimism, or any testnet. No network switching required.

Session tokens are HMAC-SHA256 signed, 7-day TTL, verified with `crypto.timingSafeEqual`.

## 6.3 24/7 Autonomous Scheduler

The scheduler runs automatically in the background, every 5 minutes, for every registered user:

```
Every 5 minutes:
  1. Fetch APRs from all enabled protocols (once, shared across all users)
  2. Fetch gas price from CoinGecko (once)
  3. For each user:
     a. Acquire per-user scheduler lock (prevents overlap)
     b. Run 6-step decision engine
     c. If ROTATE:
        - auto mode → execute immediately
        - telegram_approval → send Telegram message with Approve/Reject buttons
        - manual_confirm → set pending in DB (user approves via UI)
     d. Release lock
```

**Key optimization:** APR fetches and gas price fetches happen once per cycle, not once per user. This prevents N redundant RPC calls and CoinGecko API calls for N users.

## 6.4 Decision Engine (6 Layers)

See Section 8 for full technical deep-dive.

Summary: The engine doesn't just compare numbers — it scores signal quality using EMA smoothing, momentum measurement, volatility normalization, and persistence filtering. It says NOOP far more than it says ROTATE, which is correct behavior.

## 6.5 Execution Modes

| Mode | Behavior |
|---|---|
| `manual_confirm` | Decision shown in DApp UI. User clicks Approve or Reject. |
| `telegram_approval` | Telegram message sent with inline Approve/Reject buttons. 30-minute expiry. |
| `auto` | If all engine conditions met, executes immediately. No human required. |

One-click toggle between `telegram_approval` and `manual_confirm` in the Telegram panel — no need to navigate to Rules.

## 6.6 Telegram Integration (Full)

**Current capabilities (implemented):**
- Sends approval requests with inline keyboard buttons
- Buttons contain `approve|{userId}|{decisionId}` — userId is embedded so the webhook can resolve the correct user
- Webhook handler at `POST /api/telegram` validates `X-Telegram-Bot-Api-Secret-Token`, deduplicates via DB to prevent double-execution on retries
- 30-minute approval window with automatic expiry
- AI-generated explanation text in approval messages (when `ANTHROPIC_API_KEY` is set)

**Planned (Phase 1.5):**
- Bidirectional command interface
- User types free-text commands in Telegram chat
- AI parses intent against a 5-intent whitelist
- Confirmation gate for destructive operations
- Fallback keyword matcher when AI is unavailable

## 6.7 Multi-Protocol, Multi-Chain Architecture

**Current (Phase 1 — active):**
- Aave V3 on Ethereum Sepolia
- Compound V3 on Ethereum Sepolia
- Deposits: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia

**Ready (Phase 2 — adapters implemented, disabled):**
- Radiant Capital on Arbitrum
- Morpho Blue on any EVM (requires marketId)
- Mainnets: Ethereum, Arbitrum, Optimism, Base

**Adding a new protocol requires only:**
1. One adapter file implementing the standard interface (5 methods)
2. One entry in the protocol registry
3. No changes to the decision engine, executor, or UI

## 6.8 AI Layer (Claude Haiku 4.5)

**Feature A — Natural Language Rules Builder:**
User types "conservative setup, max gas $1, Telegram approvals" → AI converts to validated rules JSON → applies server-side safety clamping → user reviews and applies.

**Feature B — Decision Explainer:**
Every ROTATE/NOOP decision gets a plain-English explanation generated by Claude. Shown in the UI and included in Telegram messages. Cached per decision ID — no duplicate API calls.

**Fully optional:** System operates identically without `ANTHROPIC_API_KEY`, using deterministic fallback templates.

## 6.9 Admin Dashboard

Full observability and management interface at `/admin`:
- System overview stats (balance, protocol, rotation count, execution mode)
- Live APR snapshot with per-protocol error display
- Protocol Registry with enable/disable/delete per row
- Chain Registry with enable/disable/delete per row
- Runtime credential management (RPC URLs, contract addresses — no server restart needed)
- Decision rules editor
- Full execution history log
- Scheduler status endpoint

## 6.10 Custom Protocol Registry

Admin can register any Aave V3, Compound V3, or Morpho Blue instance at runtime via the Admin UI "Add Protocol" button — no code changes, no deployment. The registered instance gets a live adapter immediately:
- Aave: needs `contractAddress` + `usdcAddress`
- Compound: needs `contractAddress`
- Morpho: needs `contractAddress` + `marketId` (bytes32)

Each custom adapter queries its own chain's RPC — a custom Aave on Arbitrum queries Arbitrum's RPC, not Sepolia's.

---

# 7. TECHNICAL ARCHITECTURE

## Stack Overview

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js + React | Server-side rendering, API routes co-located |
| Backend | Next.js API routes (Node.js) | No separate backend server needed |
| Database | SQLite (better-sqlite3) | Zero-config, WAL mode for concurrency, per-user isolation |
| Global config | JSON files (`data/`) | Human-readable, runtime-editable via Admin UI |
| Auth | EIP-191 personal_sign + HMAC-SHA256 | No JWT library, no external auth service |
| Blockchain | ethers.js v6 | Standard, well-audited EVM library |
| AI | Anthropic Claude Haiku 4.5 | Fast, cheap, sufficient for structured output tasks |
| Notifications | Telegram Bot API | No app install required, inline keyboard buttons |
| Deployment | Railway (Dockerfile included) | Zero-config container deployment |

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│         MetaMask ←──── SIWE personal_sign ────→ DApp        │
└─────────────────────────────┬────────────────────────────────┘
                              │  HTTPS REST  (Bearer token)
┌─────────────────────────────▼────────────────────────────────┐
│                  Next.js Server (Railway)                     │
│                                                              │
│  /api/auth/*     /api/check      /api/approve               │
│  /api/protocols  /api/chains     /api/credentials           │
│  /api/ai/rules   /api/ai/explain /api/telegram              │
│  /api/wallet/*   /api/health     /api/scheduler/status      │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Scheduler  │  │  Decision    │  │  Protocol        │   │
│  │  (5-min     │  │  Engine      │  │  Adapter         │   │
│  │  setInterval│  │  (6 layers)  │  │  Registry        │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  AI Layer   │  │  Executor    │  │  User Wallet     │   │
│  │  (Claude    │  │  (withdraw + │  │  (AES-encrypted  │   │
│  │   Haiku)    │  │   supply)    │  │   private keys)  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
┌───────────────▼──────┐    ┌──────────────▼───────────────────┐
│  SQLite DB           │    │  Blockchain (ethers.js v6)        │
│  · users             │    │  Sepolia · Base Sep · Arb Sep     │
│  · agent_wallets     │    │  Aave V3 Pool                     │
│  · user_rules        │    │  Compound V3 Comet                │
│  · user_state        │    │  USDC ERC-20                      │
│  · user_history      │    └───────────────────────────────────┘
│  · auth_nonces       │
│  · scheduler_lock    │    ┌───────────────────────────────────┐
│  · telegram_callbacks│    │  Telegram Bot API                 │
│  · ai_decision_cache │    │  sendMessage + inline keyboard    │
└──────────────────────┘    │  POST /api/telegram (webhook)     │
                            └───────────────────────────────────┘
```

## Data Layer Split

**SQLite (per-user, concurrent-safe):**
Everything that belongs to a specific user: their wallet, state, rules, history, nonces, scheduler locks, Telegram callback deduplication, AI explanation cache.

**JSON files (global, admin-managed):**
Configuration that the admin controls: which protocols are enabled, which chains are active, RPC URLs and contract addresses, Telegram bot credentials.

This split means: adding 1,000 users does not bloat the config files. Adding 10 protocols does not pollute user data.

## Auth Flow (SIWE-lite)

```
1. Browser → POST /api/auth/challenge  { address }
   Server  → { nonce (random 16-byte hex, 5-min TTL), message }

2. Browser → MetaMask: personal_sign(message)
   MetaMask → signature

3. Browser → POST /api/auth/verify  { address, signature }
   Server  → ethers.verifyMessage(message, signature)
            → if matches address → create user (first time) → create agent wallet
            → return { token: base64url(userId:ts:HMAC-SHA256), agentWallet }

4. All subsequent requests:
   Header: Authorization: Bearer {token}
   Server: verifySessionToken → timingSafeEqual → userId
```

No JWT libraries. No OAuth. No external auth service. Works from any EVM network.

## Scheduler — Concurrency Model

```
Global flag: schedulerStarted = false
startScheduler() → if already started, return (idempotent)
                 → setInterval(runAllUsers, 5 * 60 * 1000)

runAllUsers():
  aprSnapshot = await fetchAllAPRs()   // 1 RPC call, shared
  gasCostUsd  = await estimateGas()    // 1 CoinGecko call, shared
  appendSnapshot(aprSnapshot)           // 1 write, deduplicated (60s guard)

  for each user:
    acquireSchedulerLock(userId, ttl=4min)  // prevents overlap if cycle > 5min
    runCheckForUser(userId, aprSnapshot, gasCostUsd)
    releaseSchedulerLock(userId)
```

The per-user lock prevents the case where a slow execution (network congestion) causes the next scheduler cycle to start for the same user before the previous one finishes.

---

# 8. DECISION ENGINE — DEEP DIVE

This is the core intellectual property of AutoYield. It is what separates the product from a simple APR comparison script.

## Inputs

```js
{
  state: { currentProtocol, lastMoveTimestamp },
  aprSnapshot: { aprs: { aave: 4.2, compound: 3.8 }, best: 'aave', bestAPR: 4.2 },
  history: [ ...24 APR snapshots ... ],
  rules: { minDeltaPct, cooldownMinutes, confidenceThreshold, maxGasUsdPerMove, ... },
  gasCostUsd: 0.30,
  userBalance: 5000
}
```

## Step 1 — Target Selection

```
best = protocol with highest APR across all enabled protocols
delta = best.APR - current.APR

if delta <= 0:
  → NOOP  ("already on best protocol")
```

Note: This is N-protocol aware. If 5 protocols are enabled, the engine compares all 5 and picks the absolute best. Adding a new protocol never requires changing this logic.

## Step 2 — Capital Threshold Check

```
requiredCapital = gasCostUsd / (deltaPct / 100)

if userBalance < requiredCapital:
  → NOOP  ("balance too small to justify gas at this delta")
```

**Example:** Gas = $0.30, delta = 0.3%
`requiredCapital = 0.30 / 0.003 = $100`
If balance < $100 → NOOP.

This single check eliminates the most common failure mode of naive yield bots.

## Step 3 — Annual Profitability Model

```
projectedAnnualGain = userBalance × deltaPct / 100
expectedAnnualGasCost = gasCostUsd × rules.maxMovesPerYear

if projectedAnnualGain <= expectedAnnualGasCost:
  → NOOP  ("rotation not economically justified on annual basis")
```

**Example:**
- Balance: $1,000, delta: 0.5%, max moves/year: 52 (weekly)
- Annual gain: $5.00
- Annual gas: $0.30 × 52 = $15.60
- $5.00 ≤ $15.60 → NOOP

The same user with $5,000:
- Annual gain: $25.00
- Annual gas: $15.60
- $25.00 > $15.60 → passes this check

## Step 4 — Trend Analysis & Confidence Scoring

This is the engine's most sophisticated component.

### 4a — EMA Smoothing

```
smoothedAPR[protocol] = EMA(aprHistory[protocol], window=6)
emaDelta = smoothedAPR[best] - smoothedAPR[current]

if emaDelta <= 0:
  → NOOP  ("smoothed trend does not confirm snapshot delta")
```

Why EMA? A single-check delta spike (e.g., a protocol briefly shows 10% APR due to a data anomaly) would trigger rotation on a naive system. EMA smoothing over 6 checks (30 minutes) filters out such spikes.

### 4b — Momentum

```
deltaHistory = [snapshot[i].bestAPR - snapshot[i].currentAPR for i in last 12]
momentum = deltaHistory[-1] - deltaHistory[-6]
```

- Positive momentum: the delta is growing → signal strengthening → good
- Negative momentum: the delta is shrinking → may reverse before execution → risk

Momentum is included in the confidence score output and shown in the UI.

### 4c — Volatility

```
deltaVolatility = stddev(deltaHistory)
```

Low volatility = the delta has been consistently positive = structural opportunity.
High volatility = the delta is noisy = current snapshot may not hold.

### 4d — Persistence

```
consecutivePositive = count of last N snapshots where delta > 0
persistenceFactor = min(consecutivePositive / rules.minPersistenceChecks, 1.0)
```

Default `minPersistenceChecks = 6`. A delta that appeared positive once is not persistent. One that appeared positive for 6 consecutive checks (30 minutes) is.

### 4e — Final Confidence Score

```
confidenceScore = (emaDelta / (deltaVolatility + 0.01)) × persistenceFactor

if confidenceScore < rules.confidenceThreshold (default: 0.6):
  → NOOP  ("signal quality insufficient")
```

**Interpretation table:**

| Scenario | emaDelta | Volatility | Persistence | Score | Decision |
|---|---|---|---|---|---|
| Strong structural shift | 0.5% | 0.05% | 6/6 | **10.0** | ROTATE |
| Moderate, stable | 0.4% | 0.2% | 5/6 | **3.1** | ROTATE |
| High delta but noisy | 0.8% | 1.2% | 3/6 | **0.33** | NOOP |
| Low delta, flaky | 0.3% | 0.4% | 2/6 | **0.25** | NOOP |
| Single spike | 0.6% | 0.3% | 1/6 | **0.33** | NOOP |

The engine scores signal quality, not just signal presence. This is what makes it an intelligent agent rather than a comparator.

## Step 5 — Cooldown Check

```
if (now - lastMoveTimestamp) < rules.cooldownMinutes:
  → NOOP  ("too soon since last rotation")
```

Default cooldown: 60 minutes. Prevents thrashing if rates oscillate around the threshold.

## Step 6 — Safety Guards

```
if gasCostUsd > rules.maxGasUsdPerMove:
  → NOOP  ("gas spike — protect user from network congestion")

if userBalance > rules.maxTotalValueUsd:
  → NOOP  ("balance exceeds configured cap — conservative limit")
```

These are hard stops that override everything else. Gas spikes on Ethereum mainnet can reach $40+ — a user who set `maxGasUsdPerMove = $2` will never pay $40 for a rotation.

## Decision Output Object

```json
{
  "id": "a3f7b2c1d4e59806",
  "action": "ROTATE",
  "from": "aave",
  "to": "compound",
  "deltaPct": 0.52,
  "emaDelta": 0.48,
  "momentum": 0.04,
  "deltaVolatility": 0.09,
  "confidenceScore": 2.84,
  "persistenceChecks": 5,
  "gasCostUsd": 0.30,
  "projectedAnnualGain": 26.00,
  "expectedAnnualGasCost": 3.60,
  "reason": "Delta persistent for 5/6 checks. Confidence 2.84 > threshold 0.6. Annual gain $26 exceeds gas cost $3.60."
}
```

Every field in this object is shown in the UI and included in the Telegram message. The user sees exactly what the agent saw and exactly why it decided what it decided.

---

# 9. AI LAYER

## Design Principle: AI Augments, Never Controls

The AI layer has a strict safety contract:
- AI **never** receives signing keys or wallet private keys
- AI **never** changes the `action` field (NOOP/ROTATE) — that decision is made deterministically
- AI **never** fabricates numbers — it only receives the decision object and rephrases it
- All AI output is validated and sanitized server-side before use
- Unknown fields from AI output are stripped
- Numeric values from AI (for rules) are re-clamped regardless of what the model returns

```
Deterministic Engine  →  decision object  →  AI (explain only)
                                          →  UI text, Telegram text

User input (natural language)  →  AI (parse only)  →  validated rules JSON
                                                    →  server-side clamped
                                                    →  applied
```

## Feature A — Natural Language Rules Builder

**Endpoint:** `POST /api/ai/rules`

User writes: *"I want conservative settings. No more than 1 move per month. Gas below $0.50. Always ask me on Telegram before moving."*

Claude Haiku parses this and returns:
```json
{
  "rules": {
    "cooldownMinutes": 43200,
    "maxMovesPerYear": 12,
    "maxGasUsdPerMove": 0.50,
    "executionMode": "telegram_approval"
  },
  "explanation": "Set monthly cooldown (43,200 min), capped annual moves at 12, gas limit at $0.50, and enabled Telegram approval mode.",
  "warnings": []
}
```

The resulting rules go through the same server-side clamping as any manual edit:
- `maxGasUsdPerMove` floor: $0.05
- `cooldownMinutes` floor: 10
- `maxMovesPerYear` ceiling: 365
- `minDeltaPct` floor: 0.1%

Rate limited to 1 call per 60 seconds per user.

## Feature B — Decision Explainer

**Endpoint:** `POST /api/ai/explain`
**Also called:** inside `POST /api/check` (server-side, automatic)

Given the deterministic decision object, Claude generates:
```json
{
  "uiText": "The delta between Compound (4.7%) and your current position on Aave (4.2%) has been positive and growing for 5 consecutive checks. The confidence score of 2.84 comfortably exceeds your threshold of 0.6, and the projected annual gain of $26 is 7× the expected gas cost of $3.60. Rotation is recommended.",
  "telegramText": "Compound is offering 0.5% more than Aave with high confidence (score 2.84). Annual gain estimate: $26 vs $3.60 gas.",
  "adminNote": "ROTATE decision. Delta stable 5/6 checks. Confidence 2.84."
}
```

Results cached in `ai_decision_cache` table by `decision.id` — no duplicate API calls if the user refreshes or Telegram retries.

## Fallback Mode

When `ANTHROPIC_API_KEY` is not set or any AI call fails:
- Rules builder: returns `null` + warning "AI unavailable, default conservative rules applied."
- Decision explainer: returns pre-written template strings from the spec.

The system is fully operational in fallback mode. AI is an enhancement, not a dependency.

---

# 10. SECURITY MODEL

## Threat Model & Mitigations

| Threat | Mitigation |
|---|---|
| Session token forgery | HMAC-SHA256 with `SESSION_SECRET`. `crypto.timingSafeEqual` with length guard. Throws on server start if `SESSION_SECRET` not set. |
| Agent wallet key theft | AES-256-CBC with `WALLET_ENCRYPTION_KEY`. Throws on server start if key not set. Key never returned to client. |
| Admin endpoint abuse | `withAdminAuth` middleware on all write endpoints. `ADMIN_SECRET` required. Returns 503 if not configured. |
| Telegram double-execution | `telegram_callbacks` DB table. `isTelegramCallbackProcessed()` checked before any execution. `markTelegramCallbackProcessed()` called before execution (not after). |
| Telegram impersonation | Webhook validates `X-Telegram-Bot-Api-Secret-Token`. Callback data contains `userId` — resolved against DB state, not trusted blindly. |
| Predictable decision IDs | `crypto.randomBytes(8).toString('hex')` — not `Date.now()`. |
| Expired approval replay | `decision.expiresAt` (now + 30min) checked in webhook and approve endpoint before execution. |
| Overlapping scheduler runs | `scheduler_lock` table with 4-minute TTL per user. |
| AI prompt injection | AI receives a read-only copy of decision data. No keys, no wallet addresses. Action field not in AI output schema. All output validated. |
| Gas spike attacks | `maxGasUsdPerMove` hard cap checked in engine and enforced server-side. |
| Rate abuse | 60-second per-user rate limit on `/api/check` and `/api/ai/*`. |

## Custody Model — Honest Assessment

The server holds encrypted private keys. Users should only deposit funds they are willing to have managed by this automated system. The encryption key is `WALLET_ENCRYPTION_KEY` — if this is compromised, keys can be decrypted.

Mitigation: The system is designed for testnet (MVP phase). Production deployment should use HSM or KMS for key storage (Phase 2 hardening item).

For the MVP, the security model is: **trust the server operator**. This is the same trust model as any custodial exchange or hosted wallet, except that the key management code is explicit and auditable in the repository.

---

# 11. BUSINESS MATH & SCENARIO ANALYSIS

## The Break-Even Question

The fundamental question every user should ask: *"Will this make me money?"*

The answer depends entirely on balance, delta, and rotation frequency. AutoYield is honest about this — the decision engine says NOOP when the answer is "no".

## Gas Cost Context

| Network | Gas per rotation (2 txs: withdraw + supply) |
|---|---|
| Ethereum mainnet (high congestion) | $10 – $40 |
| Ethereum mainnet (normal) | $3 – $10 |
| Arbitrum / Optimism (L2) | $0.05 – $0.50 |
| Testnet (MVP) | $0.10 – $0.30 |

**The MVP targets L2 mainnet for production.** At $0.30 gas, the economics work for balances as small as $500.

## Break-Even Capital by Delta (Gas = $0.30)

| Delta (APR difference) | Min balance to break even on 1 rotation |
|---|---|
| 0.1% | $300 |
| 0.3% | $100 |
| 0.5% | $60 |
| 1.0% | $30 |

Any balance above these thresholds: each individual rotation is profitable. Whether to rotate also depends on expected frequency (see profitability matrix below).

## Full Rotation Profitability Matrix

| Balance | Delta | Frequency | Annual Gas | Annual Gain | Net | AutoYield Decision |
|---|---|---|---|---|---|---|
| $1,000 | 0.3% | Daily (365×) | $109.50 | $3.00 | **-$106.50** | NOOP |
| $1,000 | 0.3% | Weekly (52×) | $15.60 | $3.00 | **-$12.60** | NOOP |
| $1,000 | 0.3% | Monthly (12×) | $3.60 | $3.00 | **-$0.60** | NOOP |
| $1,000 | 0.5% | Monthly (12×) | $3.60 | $5.00 | **+$1.40** | ROTATE (marginal) |
| $1,000 | 1.0% | Monthly (12×) | $3.60 | $10.00 | **+$6.40** | ROTATE |
| $5,000 | 0.3% | Monthly (12×) | $3.60 | $15.00 | **+$11.40** | ROTATE |
| $5,000 | 0.5% | Weekly (52×) | $15.60 | $25.00 | **+$9.40** | ROTATE |
| $5,000 | 0.5% | Daily (365×) | $109.50 | $25.00 | **-$84.50** | NOOP |
| $10,000 | 0.5% | Weekly (52×) | $15.60 | $50.00 | **+$34.40** | ROTATE |
| $20,000 | 0.3% | Weekly (52×) | $15.60 | $60.00 | **+$44.40** | ROTATE |

**The key insight:** Daily rotation is almost never rational at typical deltas for balances under $20,000. AutoYield prevents exactly this mistake.

## Realistic Annual Net Gain (Conservative Case)

Assumptions: delta = 0.4% (below historical typical of 0.5%), gas = $0.30.

| Balance | Rotations/Year | Annual Gas | Annual Gain | Net Gain |
|---|---|---|---|---|
| $1,000 | 4 | $1.20 | $4.00 | **+$2.80** |
| $5,000 | 12 | $3.60 | $20.00 | **+$16.40** |
| $10,000 | 26 | $7.80 | $40.00 | **+$32.20** |

These gains are small in absolute terms. AutoYield's value proposition is not "get rich." It is: *capture value that would otherwise be left on the table due to inattention, without destroying capital through over-rotation.*

## APR Data (Historical 2023–2025)

| Protocol | Low APR | Typical APR | High APR |
|---|---|---|---|
| Aave V3 USDC (Ethereum) | 2.1% | 4.2% | 11.8% |
| Compound V3 USDC (Ethereum) | 1.5% | 3.6% | 9.3% |
| **APR Delta (spread)** | **0.1%** | **0.4%** | **2.1%** |

Source: DeFiLlama historical data (2023–2025).

The 0.4% typical delta is real, recurring, and exploitable — but only with a capital-aware engine that knows when not to act.

---

# 12. BUSINESS MODEL

## Current (MVP) — Free

The MVP is free for all users. Purpose: prove the product, gather users, validate the economics.

Costs:
- Railway hosting: ~$5–20/month
- Anthropic API (Claude Haiku, optional): negligible at low volume
- No blockchain costs to AutoYield (users pay their own gas)

## Phase 2 — Freemium

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | Manual checks only (no scheduler), 1 execution mode, basic rules |
| **Pro** | $5–10/month | 24/7 scheduler, all execution modes, AI rules builder, Telegram integration, full rule customization |

The conversion argument: *"Your agent made you $16 this year. It costs $60/year for Pro. But the scheduler is what makes the $16 happen."*

## Phase 3 — Performance Fee

At sufficient AUM (Assets Under Management):
- 10% of captured yield, taken as a protocol fee
- Only charged when the agent produces measurable positive delta (no gain = no fee)
- Aligned with user interests — AutoYield only earns when users earn

**Example:** User has $10,000, agent captures $40/year in yield.
AutoYield fee: $4/year (10% of $40).
User keeps: $36/year.
Compared to Yearn: user would pay $200 management fee + performance fees.

## Phase 4 — `$AYD` Token

- Governance token for DAO-controlled protocol parameters
- Staking to waive performance fees
- Protocol treasury funded by performance fees
- Decentralized agent network (agents run by token holders, not the company)

## Unit Economics (Projection at Scale)

Assumptions: 1,000 Pro users, average balance $5,000.

| Metric | Value |
|---|---|
| Total AUM managed | $5,000,000 |
| Average annual yield captured per user (0.4% delta) | $20 |
| Total yield captured for users | $20,000/year |
| Pro subscription revenue (1,000 × $7/month) | $84,000/year |
| Performance fee revenue (10% × $20,000) | $2,000/year |
| **Total revenue** | **$86,000/year** |
| Infrastructure costs (hosting, APIs) | ~$5,000/year |
| **Gross margin** | **~94%** |

At 10,000 Pro users the model scales linearly with near-zero marginal cost.

## Why This Business Model Works

1. **Zero cost to serve** — AutoYield does not custody funds, so no insurance, no auditing liability, no regulatory capital requirements
2. **Aligned incentives** — Performance fee model means AutoYield earns more when users earn more
3. **Sticky product** — Once a user has deposited to their agent wallet and configured their rules, switching cost is high (reconfigure, withdraw, set up elsewhere)
4. **Network effects** — More users = more APR history data = better signal quality for confidence scoring

---

# 13. ROADMAP

## Phase 1 — Live (Testnet MVP)

**Status:** Shipped

| Feature | Status |
|---|---|
| SIWE auth (any EVM network) | ✅ |
| Per-user agent wallets | ✅ |
| Aave V3 + Compound V3 adapters (Sepolia) | ✅ |
| 6-layer decision engine | ✅ |
| 24/7 scheduler | ✅ |
| 3 execution modes | ✅ |
| Telegram approval + webhook | ✅ |
| AI rules builder + decision explainer | ✅ |
| Multi-chain deposits (Sepolia + Base Sep + Arb Sep) | ✅ |
| Admin dashboard | ✅ |
| Custom protocol registry | ✅ |
| Morpho Blue adapter (factory-ready) | ✅ |
| Security hardening (no hardcoded secrets, admin auth) | ✅ |

## Phase 1.5 — Next Sprint (Planned)

| Feature | Description |
|---|---|
| **Telegram Command Interface** | Bidirectional Telegram: user types commands, AI parses intent, confirms, executes. 5-intent whitelist, confirm gate, rate limiting. |

## Phase 2 — Mainnets (3–6 months)

| Feature | Description |
|---|---|
| Ethereum mainnet | Aave V3 + Compound V3 on mainnet |
| Arbitrum One | Radiant Capital adapter |
| Base | Morpho Blue with live market |
| Optimism | Aave V3 |
| Gas-aware multi-chain routing | Route to best APR across all chains, accounting for bridge costs |
| Key management hardening | KMS/HSM for agent wallet keys in production |
| Freemium tier split | Free vs Pro feature gating |

## Phase 3 — Intelligence Layer (6–12 months)

| Feature | Description |
|---|---|
| ML APR forecasting | Train on historical data to predict APR trajectories, not just react to current values |
| Uniswap V3 LP strategies | Add concentrated liquidity as a yield source (higher APR, higher complexity) |
| Leveraged yield | Aave loop strategies for advanced users (opt-in, high-risk-flagged) |
| Cross-protocol optimization | Combine lending + LP positions for maximum capital efficiency |

## Phase 4 — Decentralization (12–24 months)

| Feature | Description |
|---|---|
| `$AYD` governance token | DAO-controlled parameters: fee rates, protocol whitelist, chain support |
| Token staking | Stake `$AYD` to waive performance fees |
| Decentralized agent network | Agent scheduler runs distributed across token holders, not on a single server |
| Protocol treasury | Performance fees flow to DAO treasury, governed by token holders |

---

# 14. DEMO SCRIPT (3 MINUTES)

## Pre-Demo Checklist (Complete Before Session)

- [ ] Agent wallet funded with ≥ $5,000 testnet USDC
- [ ] Rules set: `minDeltaPct = 0.4`, `confidenceThreshold = 0.6`, `cooldownMinutes = 30`, `executionMode = telegram_approval`
- [ ] Telegram bot connected and tested (send a test message)
- [ ] APR data pre-staged: Aave 4.1%, Compound 4.6% (delta 0.5% — above threshold)
- [ ] Move history pre-populated: 2–3 NOOP entries + 1 old ROTATE entry
- [ ] Browser at `/dapp`, wallet connected, agent wallet visible
- [ ] Telegram open on phone, visible to audience

## Minute 0:30 — Frame the Problem

Point to the APR panel:

> "Aave is at 4.1%. Compound is at 4.6%. Delta is 0.5%. A naive bot would rotate immediately. Let's see what AutoYield decides."

Click "Run Check."

## Minute 1:30 — Walk Through the Decision

Point to each field in the decision panel:

> "The engine just ran 6 checks. Delta is 0.5%. EMA-smoothed delta is 0.48% — the trend is confirmed over the last 30 minutes, not a spike. Confidence score is 2.84 — above our threshold of 0.6. Momentum is positive — the delta is growing, not shrinking. Projected annual gain is $26 on this $5,000 balance. Gas is $0.30. Annual gas at this rotation frequency is $3.60. $26 versus $3.60 — the math works. Decision: ROTATE."

> "If the confidence score were 0.3, we'd see NOOP here — and the reason string would tell us exactly why: 'signal too noisy, volatility too high.' That's the product. Rational inaction is a feature."

## Minute 2:30 — Telegram Approval

Show Telegram on phone. Point to the incoming message:

```
AutoYield Decision: ROTATE
From: Aave (4.1%) → Compound (4.6%)
Delta: +0.5%
Gas: ~$0.30
Projected Annual Gain: $26.00
Confidence: 2.84

Compound is offering 0.5% more than Aave with high
confidence. Annual gain estimate $26 vs $3.60 gas cost.

[✅ Approve] [❌ Reject]
```

> "The AI-generated explanation is the second line — it rephrases the decision in plain English. The user doesn't need to understand confidence scores. They just need to know: is this worth approving?"

Tap Approve. Show the transaction hash appear in the UI. Show the move history table update.

> "That's it. Full cycle: monitor → decide → explain → approve → execute. Transparent at every step."

## Backup Plans

**If testnet RPC is down:** Walk through the scenario analysis table. Show the math for why the engine would or would not rotate in each case. The business logic is the pitch, not the live transaction.

**If APR delta is near zero:** Show a NOOP result and explain: *"This is the product working correctly. The agent decided not to move — and here is the exact reason why. A naive bot would have moved and paid gas for no gain."*

**If MetaMask doesn't sign:** Pre-stage the demo with a pre-authenticated session. Keep a recorded demo video as absolute fallback.

---

# 15. Q&A PREPARATION

**Q: Why would anyone use this instead of Yearn?**

A: Different user. Yearn is for passive delegators who want maximum yield with zero involvement. AutoYield is for control-oriented users who want to see every decision, keep full custody, and pay zero management fees. Yearn charges 2% annual management + 20% of profits. On $5,000 at 5% APY, that's $150/year in fees. AutoYield's total cost: $1.20 (4 rotations × $0.30 gas). These are not competing products — they serve different user preferences.

---

**Q: The APR delta is tiny. Does this actually make money?**

A: Honestly — not always, not for everyone. For $1,000 with 0.5% delta at 12 rotations/year: net gain ≈ $1.40. For $5,000 with the same delta: $16.40. The product doesn't promise to make you rich. It promises to capture value that would otherwise be left on the table, without destroying capital through over-rotation. No human monitors APR across multiple protocols 24/7. AutoYield does. The value compounds over time across many users.

---

**Q: This is just if/else on two numbers. Where is the intelligence?**

A: Step 4 of the engine uses EMA smoothing on APR history (removes noise), momentum calculation (is the delta growing or shrinking?), volatility normalization (how reliable is the current snapshot?), and persistence filtering (how many consecutive checks showed positive delta?). The final confidence score is `(emaDelta / deltaVolatility) × persistenceFactor`. A signal that is 0.5% delta but volatile will score lower than a signal that is 0.3% delta but perfectly stable for 6 checks. This is closer to a systematic trading signal than a simple comparison. The AI layer then converts this to human-readable text so users understand what the engine saw.

---

**Q: Is this custodial?**

A: The server holds AES-256-CBC encrypted private keys. In the MVP, users trust the server operator — the same trust model as any hosted wallet. In manual and Telegram modes, the user explicitly approves every transaction. In auto mode, the user configures the rules that govern when transactions fire. For production (Phase 2), we will integrate with KMS/HSM for key management to remove the server-level key exposure entirely.

---

**Q: Mainnet gas would kill the economics. Is this only viable on L2?**

A: On Ethereum mainnet at $10–$40 per rotation, break-even capital rises to $2,000–$8,000+ depending on delta. On Arbitrum or Optimism at $0.05–$0.50, balances as small as $500 work. The MVP is testnet. The production target is L2 mainnet — specifically Arbitrum and Base. The capital-aware engine already accounts for this: it factors in actual gas cost when making decisions. Set `maxGasUsdPerMove = $0.50` and the engine will never execute when gas spikes above that.

---

**Q: What stops a malicious admin from stealing all user funds?**

A: The server operator controls the `WALLET_ENCRYPTION_KEY`. If that key is compromised, encrypted private keys in the DB can be decrypted. This is a known limitation of the MVP architecture. Mitigations: (1) the key never touches client-side code, (2) `AGENT_PRIVATE_KEY` is deliberately excluded from the credentials manager and cannot be stored via the Admin UI, (3) Phase 2 includes KMS integration to remove key material from application memory entirely. For the MVP/hackathon context, this is an acceptable trust model.

---

**Q: Why only USDC? What about other stablecoins?**

A: USDC is the dominant stablecoin on Aave and Compound with the deepest liquidity and most reliable APR data. USDT, DAI, and FRAX can be added by changing the `usdcAddress` in adapter config — the architecture supports any ERC-20. USDC was chosen first for simplicity and because it has the most comparable rates across protocols, making the APR comparison meaningful.

---

**Q: What happens if Aave changes its rate between decision and execution?**

A: The agent makes a decision at check time. Rates can move between decision and execution. This is a known limitation. The confidence scoring and EMA smoothing reduce (but don't eliminate) this risk by requiring persistent, stable signals before recommending rotation. A planned improvement: re-check rates immediately before signing and abort if delta has reversed below threshold. This is a Phase 2 feature.

---

**Q: What is your moat?**

A: Three layers: (1) **Data moat** — APR history improves confidence scoring quality over time; a new competitor starts with no history. (2) **Integration moat** — agent wallets are sticky; users deposit, configure, and forget. Switching means withdrawing, reconfiguring, re-depositing elsewhere. (3) **Trust moat** — the decision engine's transparency builds user trust. Users who have seen "NOOP — confidence 0.25, signal too noisy" and later saw that same rate reverse trust the engine. That trust is earned over time and not easily replicated.

---

*End of Presentation Document*

---

> **Repository:** `t0mmy-69/AutoYield-Agent`
> **Branch:** `claude/review-autoyield-spec-TLo9m`
> **Contact:** Present via DApp at `/dapp`, Admin at `/admin`
