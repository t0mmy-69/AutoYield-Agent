# AutoYield Agent DApp
Agent Wallet DeFi Auto-Pilot for Stablecoin Yield Optimization (Testnet MVP)

AutoYield Agent is a browser-based DApp that creates a dedicated Agent Wallet and helps users rotate USDC between lending protocols to optimize yield under strict user-defined rules.  
This MVP is designed for live demo in a web UI (no CLI). Testnet only.

## Product Summary
Stablecoin lending APR changes frequently across protocols such as Aave and Compound. Many users do not monitor APR and do not want to sign multiple transactions to keep funds optimized.

AutoYield Agent provides:
- A DApp dashboard to manage an Agent Wallet
- Rule-based autopilot to decide rotations
- Gas-aware decision logic and transparent reasoning
- Transaction execution with safety limits
- Optional Telegram approval layer before any transaction is executed

## MVP Features
### DApp UI
- Connect wallet
- View Agent Wallet address and USDC balance
- Configure autopilot rules and presets
- Run Check Now to compute decision and reasoning
- Start and pause autopilot checks
- Execute rotation (manual or Telegram approval)
- Move history with tx hashes

### Strategy (MVP)
- Asset: USDC only
- Protocols: Aave and Compound
- Strategy: rotate to higher net APR when delta >= threshold and net gain exceeds gas buffer
- Chain: testnet only

### Safety Controls
- min APR delta threshold
- max moves per day
- cooldown timer between moves
- max gas USD per move
- pause on error
- emergency withdraw to user

## DApp User Flow
### 1) Onboarding
1. User opens the DApp and clicks Connect Wallet
2. DApp shows:
   - User wallet address
   - Agent Wallet address

### 2) Funding
1. User transfers testnet USDC to Agent Wallet
2. DApp shows live USDC balance for the Agent Wallet

### 3) Rules Setup
User configures:
- risk profile preset (conservative or balanced)
- minAprDeltaPct
- maxMovesPerDay
- cooldownMinutes
- maxGasUsdPerMove
- execution.mode:
  - manual_confirm
  - telegram_approval
  - auto
- Telegram approval toggle (enabled or disabled)
- Telegram chatId for approvals (only required if telegram_approval is enabled)

Rules are stored in a local JSON store for MVP.

### 4) Autopilot Decision
User clicks Run Check Now or starts autopilot.
The system:
- fetches Aave APR and Compound APR
- estimates gas cost in USD
- computes net gain estimate
- returns a decision:
  - NOOP: do nothing
  - ROTATE: rotate from current protocol to target protocol

### 5) Execution Modes
#### manual_confirm
- DApp displays ROTATE decision
- User clicks Execute Rotation in the UI
- Agent executes the transaction
- DApp shows tx hash and updates history

#### telegram_approval (optional, toggleable)
- DApp displays ROTATE decision as Pending Approval
- System sends a Telegram message to the user with Approve and Reject buttons
- Only after user approval, the agent executes the transaction
- If user rejects or no response within timeout, execution is canceled

#### auto
- Agent executes immediately when decision is ROTATE, within the same rules and safety caps

## Telegram Approval Mode (Optional Feature)
When enabled, AutoYield Agent requires Telegram approval before executing any transaction.

Flow:
1. System detects a ROTATE opportunity
2. A Telegram message is sent to the user with Approve and Reject buttons
3. Only after user approval, the Agent Wallet executes the transaction
4. If rejected or timed out, execution is canceled

This feature can be toggled in the Rules panel.

## Pages (UI)
- `/` Landing page + Connect Wallet
- `/dashboard` Main dashboard:
  - Wallet card (user + agent address, USDC balance)
  - Rules panel
  - APR and decision panel
  - Autopilot controls
  - Move history table

## Technical Architecture (MVP)
Frontend:
- Next.js DApp UI
- Wallet connection via wagmi or ethers BrowserProvider

Backend:
- Next.js API routes for:
  - rules persistence
  - autopilot state
  - runOnce decision
  - telegram approval webhook

On-chain:
- ethers.js signer using Agent Wallet private key (testnet only)
- interacts with Aave and Compound contracts on testnet

Storage:
- JSON store for rules, state, moves, approvals

## Local Setup
### 1) Install
npm install

### 2) Env
Create `.env.local`:

RPC_URL=
NEXT_PUBLIC_CHAIN_ID=
AGENT_PRIVATE_KEY=

USDC_ADDRESS=
AAVE_POOL_ADDRESS=
COMPOUND_COMET_ADDRESS=

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

### 3) Run
npm run dev

Open:
http://localhost:3000

## Demo Script (Presentation Day)
1. Open DApp
2. Connect wallet
3. Show Agent Wallet address
4. Fund Agent Wallet with testnet USDC
5. Configure rules (min APR delta 1%, max moves/day 1)
6. Set execution mode to telegram_approval
7. Click Run Check Now and show Pending Telegram Approval
8. Approve on Telegram
9. Return to DApp and show tx hash + updated state
10. Show Move history table

## Business Model
Freemium:
- manual checks
- 1 move/day

Pro subscription:
- higher-frequency checks
- advanced rules and analytics
- unlimited moves within caps

Future:
- performance fee based on yield uplift vs baseline
- DAO treasury tier

## Roadmap
- multi-chain and multi-asset support
- protocol allowlist expansion
- volatility-aware risk scoring
- DAO treasury dashboard
- agent access analytics dashboard
