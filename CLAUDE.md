# CLAUDE.md

## Project Overview

**LionHeart** is a Chat-First DeFi application. Users interact with an AI agent (OpenClaw) that acts as both DeFi Tutor and Portfolio Manager. The agent has a verifiable on-chain identity (ERC-8004), earns trust through reputation scoring, and unlocks trading capabilities only after proving itself.

## Repository Structure

npm workspaces monorepo:

- `contracts/` — Hardhat + Solidity (IdentityRegistry ERC-8004, ReputationRegistry)
- `agent/` — OpenClaw skills + helper libraries (viem, DefiLlama, IPFS)
- `web/` — Next.js 15 + Tailwind v4 + wagmi v2 + RainbowKit
- `infra/` — EC2 provisioning and OpenClaw config

## Commands

```bash
# Install all workspaces
npm install

# Contracts
cd contracts && npx hardhat test
cd contracts && npx hardhat compile
cd contracts && npx hardhat ignition deploy ignition/modules/Deploy.ts --network arbitrumSepolia

# Frontend
cd web && npm run dev
cd web && npm run build

# Agent scripts
node agent/skills/market-research/scripts/fetch-defi-data.ts --query "top protocols"
```

## Key Design Decisions

- ERC-8004 identity: each agent is an NFT with metadata URI and optional wallet
- Reputation: on-chain feedback with tag-based scoring, self-feedback prevention
- Chat-first UX: all interactions go through the AI agent
- Reputation-gated trading: agent needs score >= 100 to execute trades
- Target chain: Arbitrum Sepolia (chainId 421614)
