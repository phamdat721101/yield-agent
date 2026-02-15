# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LionHeart** is a Chat-First DeFi application on Arbitrum Sepolia (chainId 421614). Users interact with an AI agent (OpenClaw) that acts as DeFi Tutor and Portfolio Manager. The agent has a verifiable on-chain identity (ERC-8004 NFT), earns trust through reputation scoring, and unlocks trading capabilities only after reaching score >= 100.

## Repository Structure

npm workspaces monorepo (Node >= 20):

- `contracts/` — Hardhat + Solidity 0.8.24 (IdentityRegistry ERC-8004, ReputationRegistry)
- `agent/` — OpenClaw gateway server + 5 skills + helper libraries (viem, DefiLlama, IPFS)
- `web/` — Next.js 16 + React 19 + Tailwind v4 + wagmi v3 + RainbowKit
- `infra/` — EC2 provisioning script + OpenClaw config

## Commands

```bash
# Install all workspaces
npm install

# Contracts
cd contracts && npx hardhat compile
cd contracts && npx hardhat test                                     # all tests
cd contracts && npx hardhat test test/IdentityRegistry.test.ts       # single test file
cd contracts && npx hardhat test --grep "should register"            # single test by name
cd contracts && npx hardhat ignition deploy ignition/modules/Deploy.ts --network arbitrumSepolia

# Frontend
cd web && npm run dev       # dev server
cd web && npm run build     # production build
cd web && npx eslint .      # lint

# Agent
cd agent && npm run dev     # gateway in watch mode (port 18789)
cd agent && npm start       # production gateway

# Agent skill scripts (run with tsx)
cd agent && npx tsx skills/market-research/scripts/fetch-defi-data.ts --query "top 5 arbitrum"
cd agent && npx tsx skills/trust-stamp/scripts/sign-report.ts --hash "sha256:abc..."
cd agent && npx tsx skills/wallet-control/scripts/execute-tx.ts

# Root workspace shortcuts
npm run test:contracts
npm run build:contracts
npm run dev:web
npm run build:web
```

## Architecture

### Smart Contracts

Two contracts with a dependency: **IdentityRegistry** deploys first, its address is passed to **ReputationRegistry**'s constructor.

- **IdentityRegistry** (ERC-721 + ERC-8004): Each agent is an NFT with metadata URI (`agentURI`) and optional operational wallet (`agentWallet`). Auto-incrementing IDs starting at 1. Only token owner can update metadata/wallet.
- **ReputationRegistry**: Stores `Feedback[]` per agent with tag-based scoring (`tag1`, `tag2` as bytes32), decimal-aware aggregation, SHA-256 payload hashes for verifiability, and self-feedback prevention via `ownerOf()` check.

Both use OpenZeppelin v5.1.0 (`ERC721`, `Ownable`, `IERC721`). Deployment via Hardhat Ignition (`ignition/modules/Deploy.ts`). Tests use Hardhat + Chai + ethers.js.

### Agent Gateway & Skills

The gateway (`agent/gateway/`) is an HTTP + WebSocket server (port 18789) that routes messages to skills via keyword matching (`agent/gateway/router.ts`).

**Five skills:**
| Skill | Trigger Keywords | Purpose |
|-------|-----------------|---------|
| `market-research` | tvl, protocol, defi, arbitrum | Fetches DeFi data from DefiLlama API, returns summary + SHA-256 hash |
| `trust-stamp` | sign, stamp, verify | Signs data hashes with agent's private key (ECDSA), optionally pins to IPFS |
| `daily-brief` | brief, morning, daily | Composite report: market-research across chains + trust-stamp |
| `tutor-mode` | teach, lesson, learn, quiz | DeFi curriculum (lessons 1-3 free, 4-8 premium via x402 payment gate) |
| `wallet-control` | swap, trade, deposit, withdraw | Reputation-gated (score >= 100) transaction execution with simulation |

**Helper libraries** (`agent/lib/`):
- `erc8004-client.ts` — viem-based wrapper for IdentityRegistry + ReputationRegistry reads/writes
- `defillama.ts` — DefiLlama API client (fetchProtocols, filterByChain, topByTvl)
- `ipfs.ts` — IPFS pinning via web3.storage with mock mode (`IPFS_MOCK=true`)

### Web Frontend

Next.js App Router with two main pages:
- `/` — OnboardingFlow: wallet connection (RainbowKit) + NFT minting
- `/chat` — ChatWindow: messages via useAgent hook, TrustBadge showing reputation level

**Agent communication modes** (set via `NEXT_PUBLIC_AGENT_MODE`):
- `"http"` (default): POST to `/api/agent` route, which proxies to gateway
- `"ws"`: Direct WebSocket to gateway
- `"mock"`: Local fake responses for testing

**Key custom hooks** (`web/src/hooks/`):
- `useAgent` — chat messages, connect/disconnect/sendMessage
- `useWallet` — wagmi account + NFT balance from IdentityRegistry
- `useReputation` — queries ReputationRegistry.getSummary for TrustBadge

**Contract config** in `web/src/lib/contracts.ts` — ABIs and addresses (from `NEXT_PUBLIC_*` env vars). wagmi config in `web/src/lib/wagmi-config.ts` — RainbowKit's `getDefaultConfig` with arbitrumSepolia only.

**Tailwind v4** setup: `@tailwindcss/postcss` plugin, dark theme (zinc-950 background), Geist fonts, CSS variables in `globals.css` with `@theme inline`.

## Key Design Decisions

- ERC-8004 identity: each agent is an NFT with metadata URI and optional wallet
- Reputation: on-chain feedback with tag-based scoring, decimal-aware aggregation, self-feedback prevention
- Chat-first UX: all interactions go through the AI agent
- Reputation-gated trading: agent needs score >= 100 to execute trades
- Data verifiability: all research data includes SHA-256 hash, optionally signed + pinned to IPFS
- Target chain: Arbitrum Sepolia (chainId 421614)

## Environment Variables

See `.env.example`. Key variables:
- `ARBITRUM_SEPOLIA_RPC` — RPC endpoint (default: public Arbitrum Sepolia RPC)
- `DEPLOYER_PRIVATE_KEY` — for contract deployment
- `AGENT_PRIVATE_KEY` — agent wallet for signing/transactions
- `IDENTITY_REGISTRY_ADDRESS` / `REPUTATION_REGISTRY_ADDRESS` — deployed contract addresses
- `AGENT_ID` — on-chain agent ID
- `NEXT_PUBLIC_IDENTITY_REGISTRY` / `NEXT_PUBLIC_REPUTATION_REGISTRY` — frontend contract addresses
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — RainbowKit wallet connect
- `IPFS_MOCK=true` — use mock IPFS in development
- `MOCK_AGENT=true` — use mock agent responses in frontend
