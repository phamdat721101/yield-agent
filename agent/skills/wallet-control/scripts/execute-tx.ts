/**
 * Wallet Control script — reputation-gated transaction execution
 *
 * Usage:
 *   tsx execute-tx.ts --action swap --from USDC --to ETH --amount 100
 *
 * Requires: AGENT_PRIVATE_KEY, REPUTATION_REGISTRY_ADDRESS, AGENT_ID in env
 */

import { type Hex, type Address, formatEther, parseUnits } from "viem";
import { getPublicClient, getWalletClient, getReputationSummary } from "../../lib/erc8004-client.js";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

const REPUTATION_THRESHOLD = 100n;

async function main() {
  const args = process.argv.slice(2);
  const actionIdx = args.indexOf("--action");
  const action = actionIdx >= 0 ? args[actionIdx + 1] : "swap";

  const agentId = BigInt(process.env.AGENT_ID || "1");
  const reputationAddress = process.env.REPUTATION_REGISTRY_ADDRESS as Address;
  const agentKey = process.env.AGENT_PRIVATE_KEY as Hex;

  if (!reputationAddress || !agentKey) {
    throw new Error("Missing REPUTATION_REGISTRY_ADDRESS or AGENT_PRIVATE_KEY");
  }

  // Step 1: Check reputation gate
  console.log("Checking agent reputation...");
  const summary = await getReputationSummary(reputationAddress, agentId);

  console.log(`Reputation: score=${summary.aggregatedScore}, count=${summary.feedbackCount}`);

  if (summary.aggregatedScore < REPUTATION_THRESHOLD) {
    console.log(JSON.stringify({
      action,
      status: "gated",
      reason: `Reputation score (${summary.aggregatedScore}) is below threshold (${REPUTATION_THRESHOLD}). Need more positive feedback from users.`,
      currentScore: Number(summary.aggregatedScore),
      threshold: Number(REPUTATION_THRESHOLD),
      feedbackCount: Number(summary.feedbackCount),
    }, null, 2));
    return;
  }

  // Step 2: Build transaction (simplified example — swap stub)
  console.log(`Building ${action} transaction...`);

  const publicClient = getPublicClient();

  // In production, this would build real DEX calldata
  const txProposal = {
    action,
    status: "proposed",
    details: {
      description: `${action} operation via LionHeart agent`,
      estimatedGas: "150000",
      note: "Transaction simulation and execution would happen here in production",
    },
    reputationScore: Number(summary.aggregatedScore),
    requiresApproval: true,
  };

  console.log(JSON.stringify(txProposal, null, 2));

  // Step 3: In production, await user approval then execute
  // const walletClient = getWalletClient(agentKey);
  // const hash = await walletClient.sendTransaction({...});
  // console.log(`Tx submitted: ${hash}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
