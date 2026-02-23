# AutoYield Agent DApp
Retail DeFi Auto-Pilot with Capital-Aware Decision Engine

AutoYield Agent is a browser-based DApp that creates a dedicated Agent Wallet and helps retail stablecoin holders optimize USDC yield between lending protocols in a rational, gas-aware, and transparent way.

This MVP runs on testnet only.

---

# Why This Exists

Retail users face two common problems:

1. Chasing small APR differences and losing money to gas.
2. Doing nothing and missing meaningful yield shifts.

APR difference between Aave and Compound is often:
0.1% to 0.5%

Gas per rotation:
~ $0.20 to $0.50

For small capital, rotating blindly is irrational.

AutoYield Agent solves this by introducing a capital-aware, trend-filtered, rule-based decision engine.

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

# How The Agent Actually Works

The decision engine has 4 layers.

---

## Layer 1 — Snapshot Comparison

The system fetches:

- Aave USDC APR
- Compound USDC APR

Compute:

deltaPct = targetAPR - currentAPR

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

## Layer 4 — Trend Persistence Filter

The agent stores APR history.

Rotate only if:

- Delta persists for N consecutive checks  
OR  
- Delta trend is increasing  

This avoids flip-flop behavior and noise chasing.

---

# Execution Modes

The user chooses execution mode:

- manual_confirm → approve inside DApp
- telegram_approval → approve via Telegram
- auto → fully automatic within rules

Telegram mode is toggleable.

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

1. Connect wallet
2. View Agent Wallet address
3. Transfer USDC to Agent Wallet
4. Configure rules
5. Click Run Check
6. View:
   - APR values
   - delta
   - gas estimate
   - projected annual gain
   - decision + reasoning
7. Approve execution (UI or Telegram)
8. View transaction hash
9. View move history

---

# Example Scenario

## Case A — $1000 balance

Delta = 0.3%

ProjectedAnnualGain = $3

Gas = $0.30  
4 rotations/year = $1.20  

Net ≈ $1.80  

Agent may rotate only if delta persists.

---

## Case B — $5000 balance

Delta = 0.5%

ProjectedAnnualGain = $25

Gas ≈ $1.20 annually  

Net ≈ $23.80  

Agent ROTATE justified.

---

# Architecture Overview

Frontend:
- Next.js DApp

Backend:
- Next.js API routes
- JSON storage (rules, state, history)

On-chain:
- ethers.js
- Agent Wallet signer
- Aave and Compound contracts (testnet)

Telegram:
- Bot API
- Inline approval buttons
- Webhook handler

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

- Multi-asset
- Multi-chain
- Volatility detection
- Smart treasury mode
