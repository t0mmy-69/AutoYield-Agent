# AutoYield Agent DApp
Retail DeFi Auto-Pilot with Capital-Aware Decision Engine — v3.2

AutoYield Agent is a browser-based DApp that creates a **dedicated Agent Wallet per user** and optimizes USDC yield across **N lending protocols on multiple chains** in a rational, gas-aware, and transparent way.

- **Multi-user:** Each user connects their wallet (MetaMask SIWE), gets a personal agent wallet, and has isolated state/rules/history stored in SQLite.
- **Any-EVM sign-in:** Connect from any EVM network (Polygon, mainnet, Arbitrum, etc.) — no network switching required.
- **24/7 automation:** Background scheduler checks all users every 5 minutes and executes rotations automatically (or sends Telegram approval requests).
- **Deposit & Withdraw:** Direct USDC deposit from MetaMask to agent wallet and withdraw back to user wallet — built into the Agent Wallet panel.
- **Telegram toggle:** One-click ON/OFF toggle in the Telegram panel to switch between `telegram_approval` and `manual_confirm` execution modes.
- **Admin delete controls:** Protocol and Chain Registry now have Delete buttons to remove entries at runtime without editing source code.
- **Phase 1:** Testnets — Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia — Aave V3 + Compound V3.
- **Phase 2:** Mainnets — Ethereum, Arbitrum, Optimism, Base — Radiant, Morpho adapters.

---

# Why This Exists

Retail users face two common problems:

1. Chasing small APR differences and losing money to gas.
2. Doing nothing and missing meaningful yield shifts.

**Real APR data (historical 2023–2025):**

| Protocol           | Typical APY | Range        | Chain    |
|--------------------|-------------|--------------|----------|
| Aave V3 USDC       | 4.2%        | 2.1% – 11.8% | Sepolia  |
| Compound V3 USDC   | 3.6%        | 1.5% – 9.3%  | Sepolia  |
| Radiant Capital    | 5.1%        | 2.0% – 13.0% | Arbitrum |
| Morpho Blue        | 4.7%        | 1.8% – 12.5% | Base     |
| Best–Worst spread  | 0.4–1.5%    | 0.1% – 3.5%  | —        |

Gas per rotation on L2: $0.10 – $0.50

**The core math problem:**

At $1,000 balance rotating daily at 0.3% delta:
- Daily gain = $0.008
- Daily gas = $0.30
- **Net daily loss = -$0.292**

A naive bot destroys capital. AutoYield prevents it.

The agent's job is to say NOOP most of the time, and ROTATE only when the
economics are clearly justified.

---

# Core Concept

This is NOT a vault.
This is NOT pooled capital.

Each user has:

- A dedicated Agent Wallet
- Customizable rule configuration
- Transparent decision reasoning
- Optional Telegram approval before execution

The Agent acts as a rational optimizer, not an aggressive yield chaser.

---

# Why Not Yearn?

Yearn Finance and similar protocols are excellent for users who want maximum yield
with zero involvement. AutoYield serves a different user.

| Dimension            | Yearn / Beefy           | AutoYield                      |
|----------------------|-------------------------|--------------------------------|
| Custody              | Vault holds your USDC   | You hold your keys always      |
| Fees                 | 2% mgmt + 20% perf fee  | Zero — gas only on actual moves|
| Strategy visibility  | Hidden in contract      | Every decision explained       |
| User control         | None                    | Custom rules, thresholds       |
| Approval             | Fully automatic         | UI or Telegram confirm         |

**Fee comparison on $5,000 at 5% APY:**

Yearn: $100 management + 20% of $250 = $150 in fees
AutoYield: 4 rotations × $0.30 = **$1.20 in total cost**

AutoYield is not competing with Yearn for the same user.
AutoYield serves users who want custody, transparency, and control — and are
willing to accept the trade-off of doing their own yield routing through an agent.

---

# How The Agent Actually Works

The decision engine has 4 layers.

---

## Layer 1 — Snapshot Comparison

The system fetches APRs from **all enabled protocols** concurrently via the Protocol Adapter Registry:

- Aave V3 (Sepolia — active)
- Compound V3 (Sepolia — active)
- Radiant Capital (Arbitrum — Phase 2)
- Morpho Blue (Base — Phase 2)

Compute:

bestAPR = max(all enabled protocol APRs)
deltaPct = bestAPR - currentAPR

If deltaPct <= 0 → NOOP.

---

## Layer 2 — Capital-Aware Profitability Filter

RequiredCapital = gasCost / (deltaPct / 100)

If user balance < RequiredCapital → NOOP.

This prevents irrational rotation for small balances.

Example:
Gas = $0.30  
Delta = 0.5%  

RequiredCapital ≈ $60  

If balance < $60 → NOOP.

---

## Layer 3 — Annualized Net Benefit Model

ProjectedAnnualGain = balance × deltaPct

ExpectedAnnualGasCost = gasCost × expectedRotationsPerYear

Rotate only if:

ProjectedAnnualGain > ExpectedAnnualGasCost

This ensures long-term profitability.

---

## Layer 4 — Confidence Scoring Engine

The agent maintains APR history and computes a composite confidence score.

Steps:

1. Smooth APR history with EMA (window = 6 checks) → removes single-check spikes
2. Calculate momentum: is the delta growing or shrinking?
3. Measure delta volatility: high variance → less trust in current snapshot
4. Calculate persistence: how many consecutive checks showed positive delta?

Final score:

```
confidenceScore = (emaDelta / deltaVolatility) × persistenceFactor
```

Rotate only if confidenceScore > rules.confidenceThreshold (default: 0.6)

Example — strong signal:
  emaDelta = 0.5%, volatility = 0.05%, persistence = 6/6 → score = 10.0 → ROTATE

Example — weak signal:
  emaDelta = 0.3%, volatility = 0.4%, persistence = 2/6 → score = 0.25 → NOOP

This is not a simple if/else. The agent scores signal quality.

---

# Execution Modes

The user chooses execution mode:

- manual_confirm → approve inside DApp
- telegram_approval → approve via Telegram
- auto → fully automatic within rules

Telegram mode has a dedicated ON/OFF toggle button in the Telegram panel — no need to navigate to Rules.

---

# Telegram Approval Flow

If execution.mode = telegram_approval:

1. Decision engine outputs ROTATE
2. Telegram message is sent with:
   - from protocol
   - to protocol
   - delta
   - gas estimate
   - projected annual gain
3. User clicks Approve or Reject
4. Only if approved, execution proceeds
5. If rejected or timeout → cancel

This adds human-in-the-loop control for retail users.

---

# User Flow

1. Open `/dapp` → click **Connect with MetaMask**
2. Sign the SIWE challenge in MetaMask (no gas, off-chain signature)
3. View your **Agent Wallet address** in the deposit banner or Agent Wallet panel
4. Click **↓ Deposit** in the Agent Wallet panel → enter USDC amount → confirm in MetaMask
   - *(Or manually transfer USDC to the agent address on Sepolia, Base Sepolia, or Arbitrum Sepolia)*
5. Configure rules (min delta, cooldown, execution mode, etc.)
6. Enable Telegram approval via the **Telegram: ON** toggle, or leave on Manual Confirm
7. Click **Run Check** or wait for the 24/7 scheduler (every 5 min)
8. View decision details:
   - APR values (live and EMA-smoothed)
   - Delta and momentum direction
   - Confidence score
   - Gas estimate and projected annual gain
   - Plain-language reason for ROTATE or NOOP
9. Approve execution via UI button or **Telegram** inline button
10. View transaction hashes and full move history
11. Click **↑ Withdraw** anytime to send USDC back from agent to your main wallet

---

# Scenario Analysis

Gas = $0.30 per rotation. Annual gain = balance × delta.

## Rotation Profitability by Balance and Frequency

| Balance  | Delta | Frequency     | Annual Gas | Annual Gain | Net Gain   | Decision |
|----------|-------|---------------|------------|-------------|------------|----------|
| $1,000   | 0.3%  | Daily (365×)  | $109.50    | $3.00       | -$106.50   | NOOP     |
| $1,000   | 0.3%  | Monthly (12×) | $3.60      | $3.00       | -$0.60     | NOOP     |
| $1,000   | 0.5%  | Monthly (12×) | $3.60      | $5.00       | +$1.40     | ROTATE   |
| $1,000   | 1.0%  | Monthly (12×) | $3.60      | $10.00      | +$6.40     | ROTATE   |
| $5,000   | 0.3%  | Monthly (12×) | $3.60      | $15.00      | +$11.40    | ROTATE   |
| $5,000   | 0.5%  | Weekly (52×)  | $15.60     | $25.00      | +$9.40     | ROTATE   |
| $5,000   | 0.5%  | Daily (365×)  | $109.50    | $25.00      | -$84.50    | NOOP     |
| $10,000  | 0.5%  | Weekly (52×)  | $15.60     | $50.00      | +$34.40    | ROTATE   |

Daily rotation is never justified at typical deltas for balances under $20,000.
AutoYield prevents exactly this mistake.

## Realistic Annual Net Gain (Delta = 0.4%, Conservative)

| Balance  | Agent Rotations/Year | Net Gain   |
|----------|----------------------|------------|
| $1,000   | 4                    | +$2.80     |
| $5,000   | 12                   | +$16.40    |
| $10,000  | 26                   | +$32.20    |

---

# Architecture Overview

Frontend:
- Next.js DApp
- Landing page (`/`)
- DApp Dashboard (`/dapp`) — live APRs, decisions, approvals, rules, Telegram config
- Admin Dashboard (`/admin`) — system stats, protocol/chain registry, execution log

Backend:
- Next.js API routes
- **SQLite** (`better-sqlite3`) — per-user data (state, rules, history, agent wallets, auth nonces)
- JSON files — global/admin data (protocol config, chain config, credentials, APR history)
- **SIWE-lite auth** — EIP-191 personal_sign + HMAC-SHA256 session tokens
- **24/7 Scheduler** — `setInterval(5min)` started via Next.js instrumentation hook
- Protocol Adapter Registry (`lib/protocols/`) — runtime enable/disable/delete via `data/protocols.json`
- Chain Configuration Registry (`lib/chains/`) — runtime enable/disable/delete via `data/chains.json`
- Wallet API (`/api/wallet/info`, `/api/wallet/withdraw`) — deposit info and agent→user USDC withdrawal

On-chain:
- ethers.js v6
- **Per-user agent wallets** — generated randomly, AES-256-CBC encrypted in DB
- Protocol adapters: Aave V3, Compound V3 (Phase 1), Radiant, Morpho (Phase 2)

Telegram:
- User-configurable bot token and chat ID via UI
- Inline approval buttons (Approve / Reject) with 30-min expiry window
- Webhook handler validates sender chatId and optional `TELEGRAM_WEBHOOK_SECRET`
- `/api/telegram/webhook`

---

# Business Model

Freemium:
- Manual checks
- Limited moves/day

Pro:
- Higher frequency monitoring
- Advanced rule customization
- Full Telegram integration

Future:
- Performance-based fee

---

# Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Live | Testnets: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia. Aave + Compound. Any-EVM sign-in. Full AI decision engine. Telegram alerts. |
| Phase 2 | Planned | Mainnets: Ethereum, Arbitrum, Optimism, Base. Radiant, Morpho adapters. Multi-chain routing. |
| Phase 3 | Planned | ML-based APR forecasting. Uniswap V3 LP strategies. Leveraged yield. |
| Phase 4 | Planned | `$AYD` governance token. DAO-controlled parameters. Decentralized agent network. |
