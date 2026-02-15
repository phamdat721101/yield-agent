import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";

describe("IdentityRegistry", function () {
  let registry: IdentityRegistry;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IdentityRegistry");
    registry = await Factory.deploy();
  });

  describe("register", function () {
    it("should mint an NFT and store the URI", async function () {
      const uri = "ipfs://QmTestAgentCard";
      const tx = await registry.connect(user1).register(uri);
      const receipt = await tx.wait();

      expect(await registry.ownerOf(1)).to.equal(user1.address);
      expect(await registry.getAgentURI(1)).to.equal(uri);
      expect(await registry.totalAgents()).to.equal(1);
    });

    it("should auto-increment IDs", async function () {
      await registry.connect(user1).register("uri1");
      await registry.connect(user2).register("uri2");

      expect(await registry.ownerOf(1)).to.equal(user1.address);
      expect(await registry.ownerOf(2)).to.equal(user2.address);
      expect(await registry.totalAgents()).to.equal(2);
    });

    it("should emit AgentRegistered event", async function () {
      await expect(registry.connect(user1).register("uri1"))
        .to.emit(registry, "AgentRegistered")
        .withArgs(1, user1.address, "uri1");
    });
  });

  describe("setMetadata", function () {
    it("should update URI when called by owner", async function () {
      await registry.connect(user1).register("old-uri");
      await registry.connect(user1).setMetadata(1, "new-uri");
      expect(await registry.getAgentURI(1)).to.equal("new-uri");
    });

    it("should revert when called by non-owner", async function () {
      await registry.connect(user1).register("uri");
      await expect(
        registry.connect(user2).setMetadata(1, "hacked")
      ).to.be.revertedWith("Not agent owner");
    });
  });

  describe("setAgentWallet", function () {
    it("should bind a wallet to the agent", async function () {
      await registry.connect(user1).register("uri");
      const wallet = ethers.Wallet.createRandom().address;
      await registry.connect(user1).setAgentWallet(1, wallet);
      expect(await registry.getAgentWallet(1)).to.equal(wallet);
    });

    it("should revert when called by non-owner", async function () {
      await registry.connect(user1).register("uri");
      await expect(
        registry.connect(user2).setAgentWallet(1, user2.address)
      ).to.be.revertedWith("Not agent owner");
    });
  });

  describe("tokenURI", function () {
    it("should return the agent URI", async function () {
      await registry.connect(user1).register("ipfs://card");
      expect(await registry.tokenURI(1)).to.equal("ipfs://card");
    });
  });
});
