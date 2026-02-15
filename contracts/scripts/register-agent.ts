import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

async function main() {
  const identityAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  if (!identityAddress) throw new Error("IDENTITY_REGISTRY_ADDRESS not set");

  const registry = await ethers.getContractAt("IdentityRegistry", identityAddress);

  // AgentCard metadata — in production, pin this to IPFS first
  const agentCard = {
    name: "OpenClaw LionHeart",
    description: "Verifiable DeFi Mentor — tutor, researcher, and portfolio manager",
    image: "ipfs://QmPlaceholder",
    skills: ["market-research", "trust-stamp", "daily-brief", "tutor-mode", "wallet-control"],
    chain: "arbitrum-sepolia",
  };

  // For demo, use a data URI. In production, pin to IPFS and use the CID.
  const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(agentCard)).toString("base64")}`;

  console.log("Registering agent with URI:", agentURI.slice(0, 80) + "...");
  const tx = await registry.register(agentURI);
  const receipt = await tx.wait();

  // Find the AgentRegistered event
  const event = receipt?.logs.find((log: any) => {
    try {
      return registry.interface.parseLog(log)?.name === "AgentRegistered";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = registry.interface.parseLog(event);
    console.log(`Agent registered with ID: ${parsed?.args.agentId}`);
  }

  // Optionally set agent wallet
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
  if (agentPrivateKey) {
    const agentWallet = new ethers.Wallet(agentPrivateKey);
    const agentId = await registry.totalAgents();
    const setTx = await registry.setAgentWallet(agentId, agentWallet.address);
    await setTx.wait();
    console.log(`Agent wallet set to: ${agentWallet.address}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
