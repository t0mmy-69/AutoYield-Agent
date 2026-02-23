# spec.md

# SPEC — AutoYield Agent DApp
Topic: Agent Wallet  
Angle: DeFi Auto-Pilot  
Output: Browser-based DApp (no CLI)  
Network: Testnet only

## 1) Selected Topic
Agent Wallet

## 2) Target User
Primary:
- Stablecoin holders (USDC)
- $500 to $50,000 capital range
- Passive yield seekers
- Limited time to track APR
- Prefer automation with strict control

Secondary:
- DAO treasury operators
- Crypto KOL showcasing automated yield vaults

## 3) Problem
Stablecoin lending APR fluctuates across protocols.
Users must:
- manually track APR
- withdraw and supply funds manually
- sign multiple transactions
- estimate gas vs benefit

This creates high friction and leads to idle capital and suboptimal yield.

## 4) Solution Overview
AutoYield Agent is a rule-based Agent Wallet DApp that:
- displays a dedicated Agent Wallet address
- accepts user-deposited USDC
- monitors APR on Aave and Compound
- computes net yield after gas
- rotates funds only when decision rules are satisfied
- logs decisions and transactions transparently

An optional Telegram approval layer can be enabled so the user must approve every transaction before execution.

## 5) Core Flow (Single Happy Path)
1. User opens DApp and connects wallet
2. DApp shows Agent Wallet address
3. User transfers USDC to Agent Wallet
4. DApp shows USDC balance
5. User configures rules and selects execution mode
6. User clicks Run Check Now
7. Decision engine returns:
   - APR snapshot
   - gas estimate
   - decision NOOP or ROTATE
   - reason text
8. If ROTATE:
   - manual_confirm: user clicks Execute Rotation in UI
   - telegram_approval: user approves via Telegram message
   - auto: execute immediately
9. DApp displays tx hash and updates move history
10. DApp updates current protocol state

## 6) MVP Scope (3-day build)
In scope:
- DApp UI and dashboard
- Agent wallet address display
- Agent wallet USDC balance
- Rules config panel with presets
- APR compare module (Aave vs Compound)
- Gas-aware decision engine
- Execution engine for rotation
- Move history table with tx hashes
- Autopilot controls: Run Check Now, Start, Pause
- Telegram approval (toggleable)

Out of scope:
- multi-chain and multi-asset
- LP farming, leverage, advanced routing
- production-grade key management
- smart contract deployment
- mainnet usage

## 7) Rules Configuration (MVP)
Editable fields in UI:
- riskProfile: conservative or balanced
- minAprDeltaPct
- maxMovesPerDay
- cooldownMinutes
- maxGasUsdPerMove
- execution.mode: manual_confirm | telegram_approval | auto
- telegram.enabled: true or false
- telegram.chatId (required only if telegram.enabled is true and mode is telegram_approval)
- telegram.approvalTimeoutSeconds

Default demo preset:
- riskProfile: conservative
- minAprDeltaPct: 1.0
- maxMovesPerDay: 1
- cooldownMinutes: 180
- maxGasUsdPerMove: 0.75
- execution.mode: telegram_approval
- telegram.enabled: true
- telegram.approvalTimeoutSeconds: 300

## 8) Decision Engine
Inputs:
- rules
- state (currentProtocol, movesToday, lastMoveAt)
- agent wallet USDC balance
- aaveApr and compoundApr
- estimatedGasUsd
- current time

Checks (in order):
1. rotation.enabled must be true
2. agent balance must be greater than zero
3. cooldown must not be active
4. movesToday must be less than maxMovesPerDay
5. APR delta must be greater than or equal to minAprDeltaPct
6. estimatedGasUsd must be less than or equal to maxGasUsdPerMove
7. netGainUsd must exceed minNetGainUsd and gasBufferUsd

Output must include:
- decisionId
- action: NOOP or ROTATE
- from protocol and to protocol
- APR snapshot
- deltaPct
- estimatedGasUsd
- netGainUsd estimate
- reason string for UI

## 9) Execution Engine
Rotation steps:
- withdraw from current protocol
- approve USDC allowance if needed
- supply to target protocol
- capture tx hashes

Failure handling:
- set status to paused if pauseOnError is true
- store lastError message
- show UI error state

## 10) Telegram Approval Feature (Toggleable)
Purpose:
- provide off-app approval before any transaction execution
- increase user control and trust

Trigger:
- decision action is ROTATE
- execution.mode is telegram_approval
- telegram.enabled is true

Flow:
1. System sends Telegram message containing:
   - from protocol and to protocol
   - APR delta
   - estimated gas USD
   - net gain estimate
   - amount
2. User clicks Approve or Reject
3. If Approve within timeout:
   - execute rotation
4. If Reject or timeout:
   - cancel rotation
   - log status rejected or expired

UI requirements:
- toggle Telegram approval on or off
- display Telegram chatId configuration status
- show last approval request status
- show pending approval banner when waiting

Edge cases:
- Telegram API failure
- user never responds
- timeout expiration
- user blocks the bot
- multiple pending approvals must be prevented (only one pending approval at a time)

## 11) UI Requirements
Pages:
- `/` connect wallet
- `/dashboard` main interface

Dashboard components:
- wallet section: user address, agent address, agent USDC balance
- rules panel: presets and editable fields, save/apply
- APR panel: Aave APR, Compound APR, estimated gas, last check time
- controls: Run Check Now, Start, Pause
- execution button:
  - appears for ROTATE when mode is manual_confirm
  - shows pending approval state when mode is telegram_approval
- history table: time, from/to, amount, tx hashes, status

## 12) Business Model
Freemium:
- manual checks
- 1 move/day

Pro:
- higher frequency monitoring
- advanced analytics and rules
- more moves within caps

Future:
- performance-based fee
- DAO treasury tier

## 13) Success Criteria
- DApp runs locally in browser
- user can connect wallet and view agent wallet
- agent wallet USDC balance visible
- decision engine returns reasoning
- at least one successful rotation on testnet
- Telegram approval flow works end-to-end when enabled
- move history records tx hashes and final status

## 14) AI Utilization (Showcase)
AI used for:
- generating human-readable decision explanations
- gas vs yield tradeoff explanation
- risk explanation for each rule preset
AI is used for transparency and speed, not as a black-box executor.
