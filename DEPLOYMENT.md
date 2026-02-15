# Deployment & Environment Configuration

This guide details the environment variables required to deploy and run the **AgentVault** system locally and on-chain.

## 1. Smart Contracts (`contracts/.env`)

Required for deploying `AgentVault` and `YieldManager` to Arbitrum Sepolia (or any EVM chain).

```ini
# Deployer Wallet (Must have Eth for gas)
DEPLOYER_PRIVATE_KEY=0x...

# RPC Endpoints (Get from Alchemy/Infura or use Public RPCs)
# Arbitrum Sepolia Public RPC: https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

# Block Explorer Verification (Optional but recommended)
ARBISCAN_API_KEY=...
```

## 2. Agent Gateway (`.env` root)

Required for the Agent backend (`agent/`) to function, fetch news, and verify on-chain data.

```ini
# ── server configuration ──
GATEWAY_PORT=18789
CORS_ORIGIN=*

# ── skills configuration ──
# Required for 'news-analytics' skill
# Get a free key at: https://cryptopanic.com/developers/api/
CRYPTOPANIC_API_KEY=...

# ── web3 configuration ──
# RPC for Agent to read Vault balances (can be same as contracts)
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# (Optional) Agent's own private key if it needs to sign transactions automatically
AGENT_PRIVATE_KEY=0x...
```

## 3. Web Frontend (`web/.env.local`)

Required for the Next.js frontend to connect to the backend and wallet providers.

```ini
# ── wallet connect ──
# Get a Project ID from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

# ── backend connection ──
# URL of the Agent Gateway (Localhost for dev, VPS IP for prod)
NEXT_PUBLIC_GATEWAY_URL=http://localhost:18789

# ── contract addresses ──
# Update these after running 'npx hardhat run scripts/deploy.ts'
NEXT_PUBLIC_AGENT_VAULT_ADDRESS=0x...
NEXT_PUBLIC_YIELD_MANAGER_ADDRESS=0x...
```

## Local Testing Checklist
1.  [ ] **Contracts**: `cd contracts` -> `npm install` -> `npx hardhat compile`
2.  [ ] **Agent**: `npm install` (root) -> Copy `.env.example` to `.env` -> Fill `CRYPTOPANIC_API_KEY`.
3.  [ ] **Run Agent**: `npm run dev` (starts Gateway on port 18789).
4.  [ ] **Verify**: Run `npx tsx scripts/verify-agent.ts`.
