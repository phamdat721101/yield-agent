import { AgentTool } from "../lib/tools.js";
import { db } from "../lib/db.js";
import { getBalanceOf, getTokenIdForOwner } from "../lib/erc8004-client.js";
import type { Address } from "viem";

const IDENTITY_ADDRESS = (process.env.IDENTITY_REGISTRY_ADDRESS || "") as Address;

export class RegisterAgentTool implements AgentTool {
  name = "register-agent";
  description = "Register user's AI agent on-chain with ERC-8004 NFT identity";

  async execute(input: any, context?: any) {
    const walletAddr = context?.walletAddress;
    if (!walletAddr) {
      return { type: "text", message: "Connect your wallet first to register your agent on-chain." };
    }
    if (!IDENTITY_ADDRESS || IDENTITY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return { type: "text", message: "Identity Registry contract not configured on this server." };
    }

    // Step 1: On-chain truth (authoritative source)
    let onChainBalance = 0n;
    try {
      onChainBalance = await getBalanceOf(IDENTITY_ADDRESS, walletAddr as Address);
    } catch (err: any) {
      console.warn("[register-agent] balanceOf RPC failed — falling back to DB:", err.message);
    }

    if (onChainBalance > 0n) {
      // Wallet has NFT on-chain. Try to recover token ID for a friendly message.
      let tokenId: number | null = null;
      try {
        tokenId = await getTokenIdForOwner(IDENTITY_ADDRESS, walletAddr as Address);
      } catch { /* non-fatal */ }

      // Sync DB if it still has null (on-chain minted but DB missed it)
      if (tokenId) {
        const profile = await db.getProfile(walletAddr).catch(() => null);
        if (profile && !profile.agent_token_id) {
          await db.saveProfile({ ...profile, agent_token_id: tokenId }).catch(() => {});
        }
      }

      return {
        type: "text",
        message: tokenId
          ? `Your agent is already registered as **Agent #${tokenId}** on Arbitrum Sepolia. No need to mint again!`
          : `Your agent is already registered on Arbitrum Sepolia. No need to mint again!`,
      };
    }

    // Step 2: On-chain balance = 0. Check DB for stale token_id.
    const profile = await db.getProfile(walletAddr);
    if (profile?.agent_token_id) {
      // Stale DB entry: on-chain has no NFT, DB thinks one exists. Clear it.
      console.log(`[register-agent] Clearing stale token_id ${profile.agent_token_id} for ${walletAddr}`);
      await db.clearTokenId(walletAddr).catch(() => {});
    }

    // Step 3: No NFT on-chain — build and return mint action
    const agentCard = {
      name: `${profile?.agent_style || "yield_sentry"} Agent`,
      level: profile?.user_level || "intermediate",
      style: profile?.agent_style || "yield_sentry",
      protocols: profile?.whitelisted_protocols || ["aave-v3", "dolomite", "pendle"],
      min_apy: Number(profile?.min_apy_threshold || 1.5),
      owner: walletAddr,
    };
    const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(agentCard)).toString("base64")}`;

    return {
      type: "mint-erc8004",
      agentURI,
      message: `Ready to register your AI agent on Arbitrum Sepolia!\n\nThis mints an **ERC-8004 NFT** to your wallet — giving your agent a verifiable on-chain identity and enabling reputation scoring.\n\n**Agent Config:**\n- Style: ${agentCard.name}\n- Level: ${agentCard.level}\n- Protocols: ${agentCard.protocols.join(", ")}\n- Min APY: ${agentCard.min_apy}%\n\nClick **Confirm Registration** to proceed. Gas cost: ~$0.05 on Arbitrum.`,
    };
  }
}
