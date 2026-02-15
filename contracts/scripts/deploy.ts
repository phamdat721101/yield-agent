import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting deployment to Arbitrum Sepolia...");

    const [deployer] = await ethers.getSigners();
    console.log(`Typical Deployer/Agent: ${deployer.address}`);

    // 1. Deploy YieldManager (Mock Strategy)
    const YieldManager = await ethers.getContractFactory("YieldManager");
    const yieldManager = await YieldManager.deploy();
    await yieldManager.waitForDeployment();
    const yieldManagerAddress = await yieldManager.getAddress();
    console.log(`✅ YieldManager deployed to: ${yieldManagerAddress}`);

    // 2. Deploy AgentVault (Treasury) - linked to YieldManager
    const AgentVault = await ethers.getContractFactory("AgentVault");
    const agentVault = await AgentVault.deploy(yieldManagerAddress);
    await agentVault.waitForDeployment();
    const agentVaultAddress = await agentVault.getAddress();
    console.log(`✅ AgentVault deployed to: ${agentVaultAddress}`);

    console.log("\n📦 Deployment Summary:");
    console.log(`   - YieldManager: ${yieldManagerAddress}`);
    console.log(`   - AgentVault:   ${agentVaultAddress}`);
    console.log("\n⚠️  Remember to update your .env files in 'web/' and 'agent/' with these addresses!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
