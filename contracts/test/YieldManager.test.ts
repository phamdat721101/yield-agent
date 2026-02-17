import { expect } from "chai";
import { ethers } from "hardhat";
import { YieldManager, MockERC20 } from "../typechain-types";

describe("YieldManager", function () {
  let yieldManager: YieldManager;
  let token: MockERC20;
  let owner: any;
  let vault: any;

  const AMOUNT = ethers.parseUnits("5000", 6); // 5000 USDC

  beforeEach(async function () {
    [owner, vault] = await ethers.getSigners();

    // Deploy MockERC20
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    token = await TokenFactory.deploy("Mock USDC", "USDC", 6);

    // Deploy YieldManager
    const YMFactory = await ethers.getContractFactory("YieldManager");
    yieldManager = await YMFactory.deploy();

    // Mint tokens to vault (simulating the vault depositing)
    await token.mint(vault.address, AMOUNT * 10n);
  });

  describe("invest", function () {
    it("should accept investment and track principal", async function () {
      await token.connect(vault).approve(await yieldManager.getAddress(), AMOUNT);
      await yieldManager.connect(vault).invest(await token.getAddress(), AMOUNT);

      const balance = await yieldManager.getBalance(
        vault.address,
        await token.getAddress()
      );
      expect(balance).to.equal(AMOUNT);
    });

    it("should emit Invested event", async function () {
      await token.connect(vault).approve(await yieldManager.getAddress(), AMOUNT);
      await expect(
        yieldManager.connect(vault).invest(await token.getAddress(), AMOUNT)
      )
        .to.emit(yieldManager, "Invested")
        .withArgs(vault.address, await token.getAddress(), AMOUNT);
    });

    it("should accumulate multiple investments", async function () {
      const half = AMOUNT / 2n;
      await token.connect(vault).approve(await yieldManager.getAddress(), AMOUNT);

      await yieldManager.connect(vault).invest(await token.getAddress(), half);
      await yieldManager.connect(vault).invest(await token.getAddress(), half);

      const balance = await yieldManager.getBalance(
        vault.address,
        await token.getAddress()
      );
      expect(balance).to.equal(AMOUNT);
    });
  });

  describe("divest", function () {
    beforeEach(async function () {
      await token.connect(vault).approve(await yieldManager.getAddress(), AMOUNT);
      await yieldManager.connect(vault).invest(await token.getAddress(), AMOUNT);
    });

    it("should return funds on divest", async function () {
      const before = await token.balanceOf(vault.address);
      await yieldManager.connect(vault).divest(await token.getAddress(), AMOUNT);
      const after = await token.balanceOf(vault.address);
      expect(after - before).to.equal(AMOUNT);
    });

    it("should revert on insufficient principal", async function () {
      const tooMuch = AMOUNT + 1n;
      await expect(
        yieldManager.connect(vault).divest(await token.getAddress(), tooMuch)
      ).to.be.revertedWith("Insufficient principal");
    });

    it("should emit Divested event", async function () {
      await expect(
        yieldManager.connect(vault).divest(await token.getAddress(), AMOUNT)
      )
        .to.emit(yieldManager, "Divested")
        .withArgs(vault.address, await token.getAddress(), AMOUNT);
    });

    it("should update principal after partial divest", async function () {
      const half = AMOUNT / 2n;
      await yieldManager.connect(vault).divest(await token.getAddress(), half);

      const balance = await yieldManager.getBalance(
        vault.address,
        await token.getAddress()
      );
      expect(balance).to.equal(AMOUNT - half);
    });
  });

  describe("getBalance", function () {
    it("should return zero for unknown vault", async function () {
      const balance = await yieldManager.getBalance(
        owner.address,
        await token.getAddress()
      );
      expect(balance).to.equal(0);
    });
  });
});
