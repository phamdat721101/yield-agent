import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentVault, YieldManager, MockERC20 } from "../typechain-types";

describe("AgentVault", function () {
  let vault: AgentVault;
  let yieldManager: YieldManager;
  let token: MockERC20;
  let owner: any;
  let agent: any;
  let user: any;

  const AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC

  beforeEach(async function () {
    [owner, agent, user] = await ethers.getSigners();

    // Deploy MockERC20
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    token = await TokenFactory.deploy("Mock USDC", "USDC", 6);

    // Deploy YieldManager
    const YMFactory = await ethers.getContractFactory("YieldManager");
    yieldManager = await YMFactory.deploy();

    // Deploy AgentVault
    const VaultFactory = await ethers.getContractFactory("AgentVault");
    vault = await VaultFactory.deploy(await yieldManager.getAddress());

    // Mint tokens to owner
    await token.mint(owner.address, AMOUNT * 10n);
  });

  describe("deposit", function () {
    it("should accept deposits and forward to yield strategy", async function () {
      await token.approve(await vault.getAddress(), AMOUNT);
      await vault.deposit(await token.getAddress(), AMOUNT);

      const balance = await yieldManager.getBalance(
        await vault.getAddress(),
        await token.getAddress()
      );
      expect(balance).to.equal(AMOUNT);
    });

    it("should emit Deposited event", async function () {
      await token.approve(await vault.getAddress(), AMOUNT);
      await expect(vault.deposit(await token.getAddress(), AMOUNT))
        .to.emit(vault, "Deposited")
        .withArgs(await token.getAddress(), AMOUNT);
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await token.approve(await vault.getAddress(), AMOUNT);
      await vault.deposit(await token.getAddress(), AMOUNT);
    });

    it("should allow owner to withdraw", async function () {
      const before = await token.balanceOf(owner.address);
      await vault.withdraw(await token.getAddress(), AMOUNT);
      const after = await token.balanceOf(owner.address);
      expect(after - before).to.equal(AMOUNT);
    });

    it("should revert when non-owner withdraws", async function () {
      await expect(
        vault.connect(agent).withdraw(await token.getAddress(), AMOUNT)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("should emit Withdrawn event", async function () {
      await expect(vault.withdraw(await token.getAddress(), AMOUNT))
        .to.emit(vault, "Withdrawn")
        .withArgs(await token.getAddress(), AMOUNT);
    });
  });

  describe("executePayment", function () {
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-001"));
    const paymentAmount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      // Deposit funds
      await token.approve(await vault.getAddress(), AMOUNT);
      await vault.deposit(await token.getAddress(), AMOUNT);

      // Authorize agent
      await vault.authorizeAgent(agent.address);
    });

    it("should allow authorized agent to execute payment", async function () {
      const before = await token.balanceOf(user.address);
      await vault
        .connect(agent)
        .executePayment(
          await token.getAddress(),
          user.address,
          paymentAmount,
          metadataHash
        );
      const after = await token.balanceOf(user.address);
      expect(after - before).to.equal(paymentAmount);
    });

    it("should revert when unauthorized account executes payment", async function () {
      await expect(
        vault
          .connect(user)
          .executePayment(
            await token.getAddress(),
            user.address,
            paymentAmount,
            metadataHash
          )
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("should emit PaymentExecuted event", async function () {
      await expect(
        vault
          .connect(agent)
          .executePayment(
            await token.getAddress(),
            user.address,
            paymentAmount,
            metadataHash
          )
      )
        .to.emit(vault, "PaymentExecuted")
        .withArgs(await token.getAddress(), user.address, paymentAmount, metadataHash);
    });
  });

  describe("access control", function () {
    it("should allow owner to authorize and deauthorize agents", async function () {
      await vault.authorizeAgent(agent.address);
      const AGENT_ROLE = await vault.AGENT_ROLE();
      expect(await vault.hasRole(AGENT_ROLE, agent.address)).to.be.true;

      await vault.deauthorizeAgent(agent.address);
      expect(await vault.hasRole(AGENT_ROLE, agent.address)).to.be.false;
    });

    it("should revert when non-owner authorizes agent", async function () {
      await expect(
        vault.connect(agent).authorizeAgent(user.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to update yield strategy", async function () {
      const YMFactory = await ethers.getContractFactory("YieldManager");
      const newYM = await YMFactory.deploy();
      await vault.setYieldStrategy(await newYM.getAddress());
      expect(await vault.yieldManager()).to.equal(await newYM.getAddress());
    });
  });
});
