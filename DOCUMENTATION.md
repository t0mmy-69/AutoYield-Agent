# AutoYield Agent - System Documentation

Welcome to the comprehensive system documentation for the **AutoYield Agent**. This document serves as the master reference for the project's architecture, core modules, user interface, and integration points.

---

## 1. Introduction & Vision

**AutoYield Agent** is an autonomous AI-driven DeFi protocol designed to maximize yield farming returns with minimal effort and risk. 

In the highly volatile DeFi landscape, manual yield optimization is inefficient and gas-heavy. AutoYield solves this by employing an intelligent, continuous-monitoring agent that evaluates multiple lending protocols (e.g., AAVE, Compound) in real-time. When optimal conditions are met—factoring in historical data, momentum, and gas costs—the agent executes auto-routing of funds to the highest-yielding protocol.

---

## 2. System Architecture

The system is built on a modular Next.js architecture, separating the visual frontend from the background execution logic based on Web3. 

1. **Frontend (React/Next.js)**: The user-facing application detailing features, stats, and the main Dapp dashboard.
2. **Core Logic (The "Brain")**: A suite of Node.js modules running locally that handle data fetching, decision-making, and execution simulation.
3. **Data Layer**: Local JSON files simulating a database to track APY history, rules, and current state.
4. **Notification Layer**: A Telegram Bot integration that alerts users to significant APY shifts and agent executions.

---

## 3. Core Modules (The "Brain")

The operational logic resides in the `autoyield-agent/lib/` directory.

### Decision Engine (`lib/decisionEngine.js`)
The heart of the AI. It does not just look at current APY; it looks at trends:
- **Exponential Moving Average (EMA)**: Calculates short-term and long-term EMA to spot APY trends over time.
- **Momentum Scoring**: Assigns positive or negative momentum based on historical shifts, avoiding protocols that are rapidly losing yield.
- **Confidence Threshold**: Only approves a protocol switch if the calculated advantage (Delta) minus estimated gas costs exceeds a strict confidence threshold.

### Executor (`lib/executor.js`)
Handles the simulated on-chain actions once the Decision Engine triggers a move:
- **State Management**: Updates `data/state.json` to reflect the new active protocol and wallet balances.
- **Logging**: Records every successful migration in `data/history.json`.
- **Gas Estimation**: Interfaces with mock web3 providers to estimate the translation cost in Gwei.

### Telegram Notifier (`lib/telegramBot.js`)
Integrates the `node-telegram-bot-api` to push real-time updates directly to the user's phone whenever the agent successfully routes funds.

---

## 4. User Interface (The "Face")

The frontend is housed in `autoyield-agent/pages/` and styled with CSS Modules (`autoyield-agent/styles/`).

### Landing Page (`pages/index.js`)
A highly polished, conversion-optimized landing page designed with Web3 aesthetics:
- **Glassmorphism & Glow Effects**: Premium UI cards that track mouse movements for interactive glow effects.
- **Continuous Animations**: Abstract gradient orbs floating in the background.
- **Semantic Sections**: Includes Hero, Live Stats, Feature Grid, How It Works, and a full Vertical Timeline Roadmap.

### Dapp Dashboard (`pages/dapp.js`)
The control center for the user:
- Displays **Total Value Locked (TVL)** and current active strategies.
- Integrates `Chart.js` for real-time visualization of APY trends and agent performance.
- Provides a direct link to the Telegram bot for easy setup.

---

## 5. Data Flow & Local State

Since this is an MVP without a centralized database, state is maintained via JSON files in `autoyield-agent/data/`:
- `aprHistory.json`: The raw historical data pulled from AAVE and Compound.
- `state.json`: The current status of the mocked Agent Wallet (Balance, Current Protocol).
- `history.json`: The ledger of all past executions and moves.
- `rules.json`: User-defined parameters (Min Delta, Gas Limit).

---

## 6. Project Roadmap

Our vision for the evolution of AutoYield Agent:

- **Phase 1: MVP & Core Logic (Current)** 
  Launch on Sepolia Testnet. Basic AI decision engine (EMA & Momentum). Telegram alerts.
- **Phase 2: Multi-chain Expansion**
  Mainnet deployment on Arbitrum and Optimism. Addition of Radiant, Morpho. Gas-aware routing.
- **Phase 3: Advanced AI & LPs**
  Machine Learning integration for predictive APY forecasting. expansion to Uniswap V3 LPing.
- **Phase 4: Decentralized Governance**
  Launch of `$AYD` token. Transition of protocol control and AI parameter tuning to the DAO.

---

## 7. Getting Started

To run the complete system locally:

1. **Navigate to project directory**:
   ```bash
   cd AutoYield-Agent/autoyield-agent
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Access the Application**:
   - Landing Page: `http://localhost:3000`
   - Dapp Dashboard: `http://localhost:3000/dapp`
   - Core API Logs: Monitor the terminal output to see the Decision Engine running in the background.
