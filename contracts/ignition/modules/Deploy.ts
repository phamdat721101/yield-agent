import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LionHeartModule = buildModule("LionHeart", (m) => {
  const identityRegistry = m.contract("IdentityRegistry");
  const reputationRegistry = m.contract("ReputationRegistry", [identityRegistry]);
  const yieldManager = m.contract("YieldManager");
  const agentVault = m.contract("AgentVault", [yieldManager]);

  return { identityRegistry, reputationRegistry, yieldManager, agentVault };
});

export default LionHeartModule;
