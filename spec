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

Yearn / Beefy / Idle:

- Vault-based
- Pooled funds
- Strategy hidden inside contract

AutoYield:

- Per-wallet optimization
- Transparent reasoning
- Custom rules
- Telegram approval
- No pooled custody

This is a wallet assistant, not a yield vault.

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

## Step 4 — Trend Persistence Filter

Maintain APR history array.

If delta has not persisted for N consecutive checks:
  return NOOP

OR

If delta trend not increasing:
  return NOOP

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
- gasCostUsd
- projectedAnnualGain
- expectedAnnualGasCost
- confidenceScore
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

# 8. Scenario Analysis (Retail Focus)

## Example 1

Balance = $1000  
Delta = 0.3%  

ProjectedAnnualGain = $3  

ExpectedAnnualGasCost ≈ $1.20  

Rotate only if persistent.

---

## Example 2

Balance = $5000  
Delta = 0.5%  

ProjectedAnnualGain = $25  

ExpectedAnnualGasCost ≈ $1.20  

Decision: ROTATE justified.

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
