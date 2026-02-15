import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LionHeartModule = buildModule("LionHeart", (m) => {
  const identityRegistry = m.contract("IdentityRegistry");
  const reputationRegistry = m.contract("ReputationRegistry", [identityRegistry]);

  return { identityRegistry, reputationRegistry };
});

export default LionHeartModule;
