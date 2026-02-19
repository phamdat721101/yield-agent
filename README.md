# LionHeart: The Verifiable DeFi Mentor 🦁💛

LionHeart is a Chat-First DeFi application on **Arbitrum Sepolia**. It features **OpenClaw**, an AI agent with a verifiable on-chain identity (ERC-8004) that acts as your DeFi Tutor, Portfolio Manager, and Yield Hunter.

## 🌟 Key Features

- **Chat-First Interface**: Interact with your agent via natural language.
- **Verifiable Identity**: Every agent is an ERC-8004 NFT with an on-chain reputation score.
- **Yield Hunter**: Finds the best APY opportunities on Arbitrum using real-time data.
- **News & Analytics**: Real-time crypto news sentiment analysis.
- **Trust Stamp**: Signs and verifies data on-chain.
- **Tutor Mode**: Learn DeFi concepts through interactive lessons and quizzes.
- **Wallet Control**: Execute swaps and vault management (Reputation Gated).

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20
- npm

### Installation

1.  **Clone & Install**
    ```bash
    git clone <repo-url>
    cd lion-heart
    npm install
    ```

2.  **Environment Setup**
    - **Agent**: Copy `agent/.env.example` to `agent/.env` and fill in keys (especially `CRYPTOPANIC_API_KEY` for news).
    - **Web**: Copy `web/.env.example` (or create one) to `web/.env.local`.

3.  **Run Locally**
    Start both the Agent Gateway and Web Frontend with one command:
    ```bash
    npm run dev:all
    ```
    - **Web App**: [http://localhost:3000](http://localhost:3000)
    - **Agent API**: [http://localhost:18789](http://localhost:18789)

## 📂 Project Structure

- `agent/`: Node.js backend for OpenClaw (LangChain/Gemini + Express/WS).
- `web/`: Next.js 16 + Tailwind v4 + RainbowKit frontend.
- `contracts/`: Hardhat workspace for ERC-8004 Identity & Reputation registries.
- `infra/`: Infrastructure-as-Code and deployment scripts.

## 🛠️ Tech Stack

- **Chain**: Arbitrum Sepolia
- **Frameworks**: Next.js, Hardhat, Viem/Wagmi
- **AI**: Google Gemini (via `agent/lib/gemini.ts`)
- **Data**: DefiLlama, CryptoPanic
