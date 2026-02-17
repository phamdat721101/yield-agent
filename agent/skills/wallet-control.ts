import { AgentTool } from "../lib/tools.js";
import { getReputationSummary, getPublicClient } from "../lib/erc8004-client.js";
import { memory } from "../lib/memory.js";
import { type Address } from "viem";

const REPUTATION_THRESHOLD = 100n;

/**
 * Wallet Control Tool — reputation-gated transaction execution
 *
 * Extracts logic from skills/wallet-control/scripts/execute-tx.ts
 * Checks agent reputation before allowing trade operations.
 */
export class WalletControlTool implements AgentTool {
    name = "wallet-control";
    description =
        "Reputation-gated transaction execution. Requires score >= 100. Input: { action: 'swap' | 'deposit' | 'withdraw', from?: string, to?: string, amount?: string }";

    async execute(input: any): Promise<any> {
        const action = input.action || "swap";
        const reputationAddress = process.env.REPUTATION_REGISTRY_ADDRESS as Address;
        const agentId = BigInt(process.env.AGENT_ID || "1");

        if (!reputationAddress) {
            return {
                type: "Wallet Control",
                action,
                status: "error",
                message: "REPUTATION_REGISTRY_ADDRESS not configured.",
            };
        }

        try {
            // Step 1: Check reputation gate
            const summary = await getReputationSummary(reputationAddress, agentId);
            const score = summary.aggregatedScore;

            if (score < REPUTATION_THRESHOLD) {
                memory.append(
                    `Wallet control: ${action} blocked — score ${score} < ${REPUTATION_THRESHOLD}`
                );
                return {
                    type: "Wallet Control",
                    action,
                    status: "gated",
                    reason: `Reputation score (${score}) is below threshold (${REPUTATION_THRESHOLD}). Need more positive feedback from users.`,
                    currentScore: Number(score),
                    threshold: Number(REPUTATION_THRESHOLD),
                    feedbackCount: Number(summary.feedbackCount),
                };
            }

            // Step 2: Build transaction proposal (actual execution requires user approval)
            const txProposal = {
                type: "Wallet Control",
                action,
                status: "proposed",
                details: {
                    description: `${action} operation via LionHeart agent`,
                    from: input.from || "N/A",
                    to: input.to || "N/A",
                    amount: input.amount || "N/A",
                    estimatedGas: "150000",
                    note: "Transaction requires user approval before execution.",
                },
                reputationScore: Number(score),
                requiresApproval: true,
                timestamp: new Date().toISOString(),
            };

            memory.append(
                `Wallet control: ${action} proposed — score ${score} (approved)`
            );

            return txProposal;
        } catch (err: any) {
            return {
                type: "Wallet Control",
                action,
                status: "error",
                message: `Failed to check reputation: ${err.message}`,
            };
        }
    }
}
