import { AgentTool } from "../lib/tools.js";
import { getVaultBalance } from "../lib/erc8004-client.js";
import { memory } from "../lib/memory.js";
import { type Address } from "viem";

/**
 * Vault Management Tool
 * Checks AgentVault balances via on-chain reads with mock fallback.
 */
export class VaultTool implements AgentTool {
    name = "vault-manager";
    description = "Checks treasury balance and suggests yield strategies. Input: { action: 'check' | 'rebalance' }";

    private vaultAddress = (process.env.AGENT_VAULT_ADDRESS || "") as Address;
    private yieldManagerAddress = (process.env.YIELD_MANAGER_ADDRESS || "") as Address;
    // Common Arbitrum Sepolia token addresses (or mock)
    private usdcAddress = (process.env.USDC_TOKEN_ADDRESS || "") as Address;

    async execute(input: any): Promise<any> {
        const action = input.action || "check";

        if (action === "check") {
            return this.checkBalance();
        }

        if (action === "rebalance") {
            return {
                type: "Rebalance Suggestion",
                message: "Portfolio is heavy on ETH. Suggest converting 0.5 ETH to USDC to lock in profits.",
                action_required: "Approve Swap",
            };
        }

        return { error: "Unknown action. Use 'check' or 'rebalance'." };
    }

    private async checkBalance() {
        // Try on-chain read if addresses are configured
        if (this.vaultAddress && this.yieldManagerAddress && this.usdcAddress) {
            try {
                const balance = await getVaultBalance(
                    this.vaultAddress,
                    this.yieldManagerAddress,
                    this.usdcAddress
                );
                memory.append(`Vault check: USDC balance = ${balance}`);
                return {
                    type: "Vault Status",
                    source: "on-chain",
                    assets: {
                        USDC: Number(balance) / 1e6,
                    },
                    health: "Healthy (100% Collateralized)",
                    timestamp: new Date().toISOString(),
                };
            } catch (err: any) {
                console.warn("[vault] On-chain read failed, falling back to mock:", err.message);
            }
        }

        // Mock fallback
        return {
            type: "Vault Status",
            source: "mock",
            assets: {
                USDC: 15000,
                ETH: 2.5,
                YieldEarned: 45.20,
            },
            health: "Healthy (100% Collateralized)",
            yield_apy: "5.0% (Mock Strategy)",
            timestamp: new Date().toISOString(),
        };
    }
}
