import { AgentTool } from "../lib/tools.js";
import { db } from "../lib/db.js";

export class RegisterAgentTool implements AgentTool {
  name = "register-agent";
  description = "Register user's AI agent on-chain with ERC-8004 NFT identity";

  async execute(input: any, context?: any) {
    const walletAddr = context?.walletAddress;
    if (!walletAddr) {
      return { type: "text", message: "Connect your wallet first to register your agent on-chain." };
    }

    const profile = await db.getProfile(walletAddr);

    // Already minted — inform user
    if (profile?.agent_token_id) {
      return {
        type: "text",
        message: `Your agent is already registered as **Agent #${profile.agent_token_id}** on Arbitrum Sepolia. No need to mint again!`,
      };
    }

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
