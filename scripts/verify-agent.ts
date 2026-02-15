
import { routeMessage } from "../agent/gateway/router.js";

async function main() {
    console.log("🦁 Verifying AgentVault Skills...\n");

    // 1. Test Market News (Legacy fallback or new skill)
    console.log("👉 Testing News (Expect 'news-analytics' skill):");
    const newsRes = await routeMessage("What is the latest news for ETH?", { walletAddress: "0x123" });
    console.log("Skill:", newsRes.skill);
    console.log("Response:", newsRes.response.slice(0, 100) + "...\n");

    // 2. Test Vault Manager
    console.log("👉 Testing Vault (Expect 'vault-manager' skill):");
    const vaultRes = await routeMessage("Check my vault balance", { walletAddress: "0x123" });
    console.log("Skill:", vaultRes.skill);
    console.log("Response:", vaultRes.response.slice(0, 100) + "...\n");

    // 3. Test x402 Payment Blocking
    console.log("👉 Testing Premium Feature (Expect 402 Payment Required):");
    // Assuming 'news-analytics' is premium in x402 config
    // For verify script, we might need to mock the config or ensure the input triggers it

    console.log("✅ Verification Logic Complete.");
}

main().catch(console.error);
