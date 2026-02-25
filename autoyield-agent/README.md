# AutoYield Agent

A multi-user DeFi automation agent that optimizes USDC yield across lending protocols
(Aave V3, Compound V3, Radiant, Morpho) on multiple EVM chains.

## How it works

1. The scheduler runs every 5 minutes and fetches live APRs from all enabled protocols.
2. For each registered user, the decision engine evaluates whether rotating funds to a
   higher-yield protocol is profitable after gas costs, applying a confidence filter based
   on EMA-smoothed delta, momentum, and persistence metrics.
3. If a rotation is recommended:
   - `telegram_approval` mode — sends a Telegram message; user taps Approve/Reject.
   - `auto` mode — executes immediately without user intervention.
4. Execution withdraws USDC from the current protocol and supplies it to the new one via
   the user's dedicated agent wallet (private key stored encrypted in SQLite).

## Stack

- **Framework:** Next.js (Pages Router, API routes as serverless functions)
- **Database:** SQLite via `better-sqlite3` (`data/autoyield.db`)
- **Auth:** SIWE-lite (EIP-191 personal_sign → HMAC session token)
- **Chains:** Sepolia, Base Sepolia, Arbitrum Sepolia (testnets); mainnet config exists but disabled
- **Notifications:** Telegram Bot API

## Required environment variables

```env
# --- Security (mandatory, server will refuse to start without these) ---
SESSION_SECRET=<64-char hex>            # HMAC key for session tokens
WALLET_ENCRYPTION_KEY=<64-char hex>     # AES-256 key for agent private key storage
ADMIN_SECRET=<strong password>          # Admin dashboard access

# --- Network (at least one RPC required) ---
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
USDC_ADDRESS=0x...                      # USDC on Sepolia

# --- Protocol contracts (Sepolia) ---
AAVE_POOL_ADDRESS=0x...
COMPOUND_COMET_ADDRESS=0x...

# --- Optional ---
CRON_SECRET=<random>                    # Protects POST /api/cron from external callers
TELEGRAM_BOT_TOKEN=<token>             # Required for telegram_approval mode
TELEGRAM_CHAT_ID=<chat id>
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

## API endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | System health (DB + scheduler). Returns 503 if degraded. |
| GET | `/api/apr` | Current APR snapshot from all enabled protocols |
| GET | `/api/protocols` | Protocol registry |
| GET | `/api/chains` | Chain registry |
| GET | `/api/credentials` | Credential status (source only, no values exposed) |

### Authenticated (session token required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/challenge` | Get sign challenge for an address |
| POST | `/api/auth/verify` | Verify signature, get session token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/state` | Agent state (protocol, balance, pending approval) |
| GET | `/api/rules` | Decision rules for current user |
| PUT | `/api/rules` | Update decision rules |
| POST | `/api/check` | Manual decision trigger (rate-limited: 1 per 60 s) |
| POST | `/api/approve` | Approve or reject a pending rotation |
| GET | `/api/history` | Execution history |
| GET | `/api/wallet/info` | Agent wallet address + deposit instructions |
| POST | `/api/wallet/withdraw` | Withdraw USDC from agent wallet |

### Admin (`x-admin-secret` header or `__admin` cookie required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/agents` | All registered users + agent state |
| PUT | `/api/credentials` | Update RPC URLs and contract addresses |
| PATCH | `/api/chains` | Enable/disable a chain |
| DELETE | `/api/chains` | Remove a chain |
| PATCH | `/api/protocols` | Enable/disable a protocol |
| DELETE | `/api/protocols` | Remove a protocol |
| GET | `/api/scheduler/status` | Scheduler runtime stats |
| POST | `/api/cron` | Trigger decision cycle (also protected by `CRON_SECRET` if set) |

## Architecture

```
pages/
  dapp.js              ← User dashboard (connect wallet, view APRs, manage rules)
  admin.js             ← Admin dashboard (all users, credentials, protocols, chains)
  api/
    auth/              ← challenge / verify / me
    admin/agents.js    ← user registry (admin-only)
    check.js           ← manual decision trigger
    approve.js         ← approve/reject pending rotation
    cron.js            ← external cron trigger
    health.js          ← health probe
    scheduler/
      status.js        ← scheduler runtime stats (admin-only)
    wallet/            ← info / withdraw

lib/
  auth.js              ← SIWE-lite auth, withAuth, withAdminAuth
  db.js                ← SQLite schema + all DB access functions
  userWallet.js        ← per-user agent wallet create/decrypt/balance
  scheduler.js         ← 5-min global interval, runAllUsers / runCheckForUser
  decisionEngine.js    ← 6-step ROTATE/NOOP decision with confidence scoring
  executor.js          ← withdraw from source + supply to destination
  aprFetcher.js        ← fetches APR from all enabled protocols
  aprHistory.js        ← 24-snapshot rolling window + EMA/momentum metrics
  gasEstimator.js      ← gas cost in USD (CoinGecko + provider.getFeeData)
  credentials.js       ← runtime credential store (env → credentials.json)
  protocols/
    index.js           ← protocol registry
    adapters/
      aave.js          ← Aave V3 getAPR / supply / withdraw
      compound.js      ← Compound V3 getAPR / supply / withdraw
      radiant.js       ← Radiant (Phase 2)
      morpho.js        ← Morpho Blue (Phase 2)
  chains/
    configs.js         ← chain registry + enable/disable
```

## Data files

All runtime state lives in `data/` (not committed):

| File | Contents |
|------|----------|
| `autoyield.db` | SQLite: users, wallets, rules, state, history, locks |
| `credentials.json` | Runtime credential overrides (written by admin UI) |
| `protocols.json` | Protocol enable/disable flags |
| `chains.json` | Chain enable/disable flags |
| `aprHistory.json` | 24-snapshot APR rolling window |
| `rules.json` | Global/legacy decision rules (per-user rules are in SQLite) |
| `state.json` | Legacy global state |
