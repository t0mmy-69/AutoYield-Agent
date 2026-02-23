# SPEC — AutoYield Agent DApp (Retail Version)

Topic: Agent Wallet  
Angle: DeFi Auto-Pilot for Retail  
Network: Testnet MVP  

---

# 1. Product Definition

AutoYield Agent is a capital-aware, rule-based AI wallet assistant for retail stablecoin holders.

It optimizes allocation between Aave and Compound without pooling funds and without custody.

Each user controls:

- Rules
- Execution mode
- Approval mechanism

---

# 2. Target User

Primary:

- Individual stablecoin holders
- Capital: $500 – $20,000
- Passive yield seekers
- Want automation but with control

---

# 3. Competitive Positioning

## 3.1 — Landscape Overview

Yearn Finance, Beefy, and Idle Finance have been automating yield optimization since 2020, across multiple protocols and chains. They are battle-tested, well-audited, and genuinely effective.

The question is not "can we build what they built."
The question is: **who is underserved by what they built, and why?**

## 3.2 — Feature Comparison

| Dimension              | Yearn / Beefy / Idle       | AutoYield                        |
|------------------------|----------------------------|----------------------------------|
| Fund structure         | Pooled vault               | Per-wallet, isolated             |
| Custody                | Vault holds your USDC      | You hold your keys always        |
| Fees                   | 2% mgmt + 20% performance  | Zero — gas only on actual moves  |
| Strategy visibility    | Hidden inside contract     | Every decision explained in UI   |
| User rule control      | None                       | Custom thresholds, limits, modes |
| Approval flow          | Fully automatic            | UI confirm or Telegram approve   |
| Min. viable capital    | Any amount (pooled)        | ~$500 (gas-aware filter)         |
| Target user            | Passive delegators         | Control-oriented retail users    |

## 3.3 — Direct Answer: Why Use AutoYield Over Yearn?

Three concrete reasons:

**1. Zero fees on the delta.**

Yearn charges 2% annual management fee plus 20% of profits.
On $5,000 earning 5% APY: management fee = $100/year, plus 20% of gains.
AutoYield charges nothing. Only gas on actual rotations.
At 4 rotations/year at $0.30 each: $1.20 total cost.

**2. You keep custody, always.**

With Yearn, your USDC enters a shared pool. You receive a yToken representing vault shares.
With AutoYield, your USDC stays in your Agent Wallet. Only your key authorizes moves.
No smart contract risk from pooling. No exposure to other users' actions.

**3. You see every decision before it executes.**

Yearn executes strategy changes without your knowledge.
AutoYield shows: current APR, target APR, delta, gas cost, projected gain, confidence score, trend direction, and a plain-language reason string — before any transaction fires.
Users learning DeFi, not just outsourcing it, will choose transparency.

## 3.4 — Honest Trade-Off

Yearn accesses more protocols, more chains, more liquidity depth.
For pure yield maximization with zero involvement, Yearn likely wins.

AutoYield is not competing for that user.
AutoYield serves users who want custody + transparency + rule control, and who are willing to accept slightly lower theoretical yield in exchange for those guarantees.

This is a wallet assistant, not a yield vault.

---

# 3.5 — Real APR Market Data

## APR Range Analysis (Historical 2023–2025)

| Protocol                   | Low   | Typical | High   |
|----------------------------|-------|---------|--------|
| Aave USDC (Ethereum)       | 2.1%  | 4.2%    | 11.8%  |
| Compound USDC (Ethereum)   | 1.5%  | 3.6%    | 9.3%   |
| APR Delta (Aave vs Compound) | 0.1% | 0.4%  | 2.1%   |

Source: DeFiLlama historical data, protocol dashboards (2023–2025).

## What the Delta Numbers Actually Mean

A delta of 0.4% (typical) is not noise — it is a real and recurring spread.
But its value depends entirely on balance and rotation frequency.

| Delta | Balance  | Annual Gain from Delta |
|-------|----------|------------------------|
| 0.3%  | $1,000   | $3.00                  |
| 0.5%  | $1,000   | $5.00                  |
| 0.5%  | $5,000   | $25.00                 |
| 1.0%  | $10,000  | $100.00                |

## Gas Cost Context

| Network                  | Gas per rotation (2 txs) |
|--------------------------|--------------------------|
| Ethereum mainnet         | $5.00 – $40.00           |
| Arbitrum / Optimism      | $0.05 – $0.50            |
| Testnet (this MVP)       | $0.10 – $0.30            |

The capital-aware filter is most impactful on L2 mainnet, where gas is low enough
that balances as small as $500 can justify rotation at meaningful deltas.

## Break-Even Capital by Delta (Gas = $0.30)

| Delta  | Min Balance to Break Even on 1 Rotation |
|--------|-----------------------------------------|
| 0.1%   | $300                                    |
| 0.3%   | $100                                    |
| 0.5%   | $60                                     |
| 1.0%   | $30                                     |

Any balance above these thresholds: each individual rotation is profitable.
Whether to rotate depends also on expected frequency (covered in Scenario Analysis).

---

# 4. Decision Engine Logic (Precise Definition)

Inputs:

- currentProtocol
- userBalance
- aaveAPR
- compoundAPR
- gasCostUsd
- historicalAPRData
- rules configuration

---

## Step 1 — Determine Target Protocol

If compoundAPR > aaveAPR:
  target = Compound
Else:
  target = Aave

deltaPct = targetAPR - currentAPR

If deltaPct <= 0:
  return NOOP

---

## Step 2 — Capital Threshold Check

RequiredCapital = gasCostUsd / (deltaPct / 100)

If userBalance < RequiredCapital:
  return NOOP

---

## Step 3 — Annual Profitability Model

ProjectedAnnualGain = userBalance × deltaPct

ExpectedRotationsPerYear = rules.maxMovesPerYear
ExpectedAnnualGasCost = gasCostUsd × ExpectedRotationsPerYear

If ProjectedAnnualGain <= ExpectedAnnualGasCost:
  return NOOP

---

## Step 4 — Trend Analysis and Confidence Scoring

Simple "N consecutive checks" is not enough. A delta can be consistently 0.1% —
persistent but economically irrelevant. This step quantifies signal quality.

**4a — Exponential Moving Average (EMA) on APR History**

  smoothedAaveAPR     = EMA(aprHistory.aave, window=6)
  smoothedCompoundAPR = EMA(aprHistory.compound, window=6)
  emaDelta            = smoothedCompoundAPR - smoothedAaveAPR

  If emaDelta <= 0:
    return NOOP

Using smoothed values instead of snapshots eliminates single-check spikes.

**4b — Momentum Calculation**

  deltaHistory = [snapshot.compoundAPR - snapshot.aaveAPR for last 12 snapshots]
  momentum     = deltaHistory[-1] - deltaHistory[-6]

  Positive momentum: delta is growing → stronger signal
  Negative momentum: delta is shrinking → may reverse before rotation executes

**4c — Volatility Measurement**

  deltaVolatility = standard_deviation(deltaHistory)

  High volatility = current snapshot is unreliable
  Low volatility  = delta is structural, not noise

**4d — Persistence Factor**

  consecutivePositive = count of consecutive snapshots where delta > 0
  persistenceFactor   = min(consecutivePositive / rules.minPersistenceChecks, 1.0)

**4e — Confidence Score (Final)**

  confidenceScore = (emaDelta / (deltaVolatility + 0.01)) × persistenceFactor

  If confidenceScore < rules.confidenceThreshold:
    return NOOP

  Default rules.confidenceThreshold = 0.6

**Interpretation examples:**

  emaDelta = 0.5%, volatility = 0.05%, persistence = 6/6 checks
  → confidenceScore = (0.5 / 0.05) × 1.0 = 10.0  → strong ROTATE signal

  emaDelta = 0.3%, volatility = 0.4%, persistence = 2/6 checks
  → confidenceScore = (0.3 / 0.4) × 0.33 = 0.25  → NOOP (noisy, not persistent)

This is what separates AutoYield from a simple if/else comparison.
The agent scores signal quality, not just signal presence.

---

## Step 5 — Cooldown Check

If timeSinceLastMove < cooldownMinutes:
  return NOOP

---

## Step 6 — Safety Checks

If:

- gasCostUsd > maxGasUsdPerMove
- userBalance > maxTotalValueUsd

Return NOOP.

---

## Final Decision

If all conditions satisfied:
  return ROTATE

Decision object includes:

- action
- from
- to
- deltaPct
- emaDelta
- momentum
- deltaVolatility
- gasCostUsd
- projectedAnnualGain
- expectedAnnualGasCost
- confidenceScore
- persistenceChecks
- reason string

---

# 5. Execution Modes

execution.mode:

manual_confirm  
telegram_approval  
auto  

telegram.enabled can be true or false.

---

# 6. Telegram Approval Logic

Trigger:

action == ROTATE  
execution.mode == telegram_approval  
telegram.enabled == true  

Process:

1. Create approval object
2. Send Telegram message
3. Wait for approval
4. If approved → execute
5. If rejected or timeout → cancel

Timeout defined by:

telegram.approvalTimeoutSeconds

Only one pending approval allowed at a time.

---

# 7. DApp Functional Requirements

Dashboard must display:

- Agent wallet address
- USDC balance
- Current protocol
- Aave APR
- Compound APR
- Delta
- Gas estimate
- Projected annual gain
- Expected annual gas cost
- Decision + reasoning
- Pending approval state
- Move history table

---

# 8. Scenario Analysis — Full Profitability Table

Gas per rotation = $0.30 (testnet/L2 equivalent).
Annual gain = balance × delta (annualized, assuming delta holds).

## Full Rotation Profitability Matrix

| Balance  | Delta | Frequency       | Annual Gas | Annual Gain | Net Gain   | Decision     |
|----------|-------|-----------------|------------|-------------|------------|--------------|
| $1,000   | 0.3%  | Daily (365×)    | $109.50    | $3.00       | -$106.50   | NOOP         |
| $1,000   | 0.3%  | Weekly (52×)    | $15.60     | $3.00       | -$12.60    | NOOP         |
| $1,000   | 0.3%  | Monthly (12×)   | $3.60      | $3.00       | -$0.60     | NOOP         |
| $1,000   | 0.5%  | Monthly (12×)   | $3.60      | $5.00       | +$1.40     | ROTATE (marginal) |
| $1,000   | 1.0%  | Monthly (12×)   | $3.60      | $10.00      | +$6.40     | ROTATE       |
| $5,000   | 0.3%  | Monthly (12×)   | $3.60      | $15.00      | +$11.40    | ROTATE       |
| $5,000   | 0.5%  | Weekly (52×)    | $15.60     | $25.00      | +$9.40     | ROTATE       |
| $5,000   | 0.5%  | Daily (365×)    | $109.50    | $25.00      | -$84.50    | NOOP         |
| $10,000  | 0.5%  | Weekly (52×)    | $15.60     | $50.00      | +$34.40    | ROTATE       |
| $20,000  | 0.3%  | Weekly (52×)    | $15.60     | $60.00      | +$44.40    | ROTATE       |

## Key Insight: Daily Rotation Is Almost Always Irrational

At $1,000 balance rotating daily (the naïve automated-bot approach):
- Daily gain from 0.3% delta = $1,000 × 0.003 / 365 = **$0.008/day**
- Daily gas cost = **$0.30/day**
- Net daily loss = **-$0.292**

AutoYield would output NOOP. A simple bot would execute and destroy the user's capital.
This is the exact problem the capital-aware engine prevents.

## Optimal Rotation Frequency by Balance

| Balance  | Max Rational Frequency (at 0.5% delta) |
|----------|----------------------------------------|
| $500     | Quarterly or less (4×/year)            |
| $1,000   | Monthly (12×/year)                     |
| $5,000   | Weekly (52×/year)                      |
| $10,000+ | Weekly or more                         |

## Realistic Annual Net Gain (Realistic delta = 0.4%, gas = $0.30)

| Balance  | Rotations/Year | Annual Gas | Annual Gain | Net Gain |
|----------|----------------|------------|-------------|----------|
| $1,000   | 4              | $1.20      | $4.00       | +$2.80   |
| $5,000   | 12             | $3.60      | $20.00      | +$16.40  |
| $10,000  | 26             | $7.80      | $40.00      | +$32.20  |

These are conservative estimates. The agent captures value precisely because
it does not over-rotate.

---

# 9. Success Criteria

- Agent prevents irrational rotation for small balances
- Agent rotates only when economically justified
- Decision reasoning visible in UI
- Telegram approval works end-to-end
- At least one successful rotation on testnet

---

# 10. Strategic Value

AutoYield Agent:

- Protects retail users from gas waste
- Adds transparency missing in vault protocols
- Introduces capital-aware AI optimization
- Preserves custody
- Adds optional human-in-the-loop control

This is not aggressive yield farming.
This is rational yield management for retail users.

---

# 11. Demo Script (Presentation Day)

## Pre-Demo Setup (complete before session starts)

- Fund Agent Wallet with testnet USDC (≥$1,000)
- Set rules: minDeltaPct = 0.4%, confidenceThreshold = 0.6, cooldown = 30min
- Confirm Telegram bot is live and connected to your chat
- Pre-stage APR data: Aave 4.1%, Compound 4.6% (delta = 0.5% → above threshold)
- Have move history pre-populated with 2–3 historical NOOP and 1 ROTATE entry

## Demo Flow (3 minutes)

**Minute 1 — Frame the problem (30 seconds)**

Show dashboard. Point to the APR display:
  "Aave is at 4.1%, Compound is at 4.6% — delta is 0.5%.
   A simple bot would rotate immediately. Let's see what AutoYield decides."

Click "Run Check."

**Minute 2 — Decision output (90 seconds)**

Show the decision panel:
- Delta: 0.5%
- EMA delta: 0.48% (smoothed)
- Confidence score: 0.72 (above threshold 0.6)
- Momentum: +0.04% (delta growing)
- Projected annual gain: $25 (on $5,000)
- Gas cost: $0.30
- Decision: ROTATE
- Reason: "Delta persistent for 5/6 checks, confidence above threshold, annual gain justifies gas."

If decision is NOOP: explain the reason string to the audience.
  "The agent decided not to rotate — here's exactly why."
  This is a feature, not a bug. Rational inaction is the product.

**Minute 3 — Telegram approval + execution (60 seconds)**

Show the Telegram message arriving on phone:
```
AutoYield Decision: ROTATE
From: Aave (4.1%) → Compound (4.6%)
Delta: +0.5%
Gas: ~$0.30
Projected Annual Gain: $25.00
Confidence: 0.72
[Approve] [Reject]
```

Tap Approve. Show transaction hash appearing in UI. Show move history table updated.

## Backup Plan (if testnet is down or APR delta is unfavorable)

Option A: Walk through the scenario analysis table manually.
  "Let me show you mathematically why the agent would or would not rotate in each case."

Option B: Show a pre-recorded demo video (record this the day before).

Option C: Show the decision output from a pre-staged JSON response to demonstrate
  the confidence scoring and reason string without requiring live testnet.

---

# 12. Q&A Preparation

**Q: Why would anyone use this instead of Yearn?**

A: Yearn is for users who want maximum yield with zero involvement.
AutoYield is for users who want to see and approve every decision, keep custody,
and pay zero management fees. Yearn charges 2% management + 20% of profits.
AutoYield charges nothing — only gas on actual rotations ($0.30 typically).
These are different users, not competing products.

---

**Q: The APR delta is often tiny. Does this actually make money?**

A: Honestly, not always — and especially not for small balances or frequent rotation.
That's the point. The agent says NOOP most of the time.
On $1,000 with 0.5% delta at 12 rotations/year: net gain ≈ $1.40/year.
On $5,000 with 0.5% delta at 12 rotations/year: net gain ≈ $16.40/year.
The value is not maximizing yield. It is preventing bad decisions and
catching the windows when rotation is genuinely worthwhile.
No human consistently tracks APR across protocols 24/7. AutoYield does.

---

**Q: This is just if/else on two numbers. Where is the intelligence?**

A: Step 4 of the decision engine uses EMA smoothing on APR history, momentum
measurement (is delta growing or shrinking?), volatility-adjusted confidence scoring,
and persistence filtering. The confidence score is a composite signal:
confidenceScore = (emaDelta / deltaVolatility) × persistenceFactor.
This is closer to a systematic trading signal than a simple comparison.
A naive bot rotating on every snapshot would lose money. AutoYield does not.

---

**Q: What happens if Aave changes its rate mid-rotation?**

A: The agent makes a decision at check time. Between decision and execution, rates
can move. This is a known limitation. The reason string and confidence score are
calculated at decision time. Future version: re-check rates immediately before
signing and abort if delta has reversed below threshold.

---

**Q: Is this custodial?**

A: No. The Agent Wallet private key is held locally by the user.
The backend API does not hold custody. In manual and Telegram modes,
the user explicitly approves every transaction. In auto mode, the user
configures the rules that govern when transactions fire.

---

**Q: Mainnet gas would kill the economics. Is this only viable on L2?**

A: On Ethereum mainnet with $10–$40 gas per rotation, break-even capital
rises to $2,000–$8,000+ depending on delta. On Arbitrum or Optimism
with $0.05–$0.50 gas, balances as small as $500 can justify rotation
at meaningful deltas. The MVP is testnet. Production target is L2 mainnet.
The economics are strongest there, and that is where retail users should run it.

---

**Q: Why only Aave and Compound?**

A: Scope discipline for the MVP. The decision engine and rule system are
protocol-agnostic. Adding a third protocol (e.g., Morpho, Spark, Fluid)
requires only a new APR data source and contract interface — no architecture change.
This is a deliberate roadmap item, not a technical limitation.
