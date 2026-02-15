import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry, ReputationRegistry } from "../typechain-types";

describe("ReputationRegistry", function () {
  let identity: IdentityRegistry;
  let reputation: ReputationRegistry;
  let owner: any;
  let agentOwner: any;
  let reviewer1: any;
  let reviewer2: any;

  const tag = (s: string) => ethers.encodeBytes32String(s);

  beforeEach(async function () {
    [owner, agentOwner, reviewer1, reviewer2] = await ethers.getSigners();

    const IdentityFactory = await ethers.getContractFactory("IdentityRegistry");
    identity = await IdentityFactory.deploy();

    const ReputationFactory = await ethers.getContractFactory("ReputationRegistry");
    reputation = await ReputationFactory.deploy(await identity.getAddress());

    // Register an agent (ID = 1) owned by agentOwner
    await identity.connect(agentOwner).register("ipfs://agent1");
  });

  describe("giveFeedback", function () {
    it("should accept feedback from a non-owner", async function () {
      await reputation.connect(reviewer1).giveFeedback(
        1, 85, 0, tag("accuracy"), tag("speed"), "https://api.example.com/chat", ethers.keccak256("0x1234")
      );

      expect(await reputation.getFeedbackCount(1)).to.equal(1);
    });

    it("should block self-feedback", async function () {
      await expect(
        reputation.connect(agentOwner).giveFeedback(
          1, 100, 0, tag("accuracy"), tag(""), "", ethers.keccak256("0x")
        )
      ).to.be.revertedWith("Cannot rate own agent");
    });

    it("should revert for non-existent agent", async function () {
      await expect(
        reputation.connect(reviewer1).giveFeedback(
          999, 50, 0, tag(""), tag(""), "", ethers.keccak256("0x")
        )
      ).to.be.reverted;
    });

    it("should emit FeedbackGiven event", async function () {
      await expect(
        reputation.connect(reviewer1).giveFeedback(
          1, 90, 0, tag("accuracy"), tag("speed"), "", ethers.keccak256("0x")
        )
      )
        .to.emit(reputation, "FeedbackGiven")
        .withArgs(1, reviewer1.address, 90, tag("accuracy"), tag("speed"));
    });
  });

  describe("getSummary", function () {
    it("should return zero for no feedback", async function () {
      const summary = await reputation.getSummary(1);
      expect(summary.feedbackCount).to.equal(0);
      expect(summary.aggregatedScore).to.equal(0);
    });

    it("should aggregate scores correctly", async function () {
      await reputation.connect(reviewer1).giveFeedback(
        1, 80, 0, tag("accuracy"), tag(""), "", ethers.keccak256("0x01")
      );
      await reputation.connect(reviewer2).giveFeedback(
        1, 100, 0, tag("accuracy"), tag(""), "", ethers.keccak256("0x02")
      );

      const summary = await reputation.getSummary(1);
      expect(summary.feedbackCount).to.equal(2);
      expect(summary.aggregatedScore).to.equal(90); // (80 + 100) / 2
    });

    it("should normalize different decimal precisions", async function () {
      // 80 with 0 decimals = 80
      await reputation.connect(reviewer1).giveFeedback(
        1, 80, 0, tag(""), tag(""), "", ethers.keccak256("0x01")
      );
      // 900 with 1 decimal = 90.0
      await reputation.connect(reviewer2).giveFeedback(
        1, 900, 1, tag(""), tag(""), "", ethers.keccak256("0x02")
      );

      const summary = await reputation.getSummary(1);
      expect(summary.feedbackCount).to.equal(2);
      // normalized: 800 + 900 = 1700 / 2 = 850 (with 1 decimal = 85.0)
      expect(summary.aggregatedScore).to.equal(850);
      expect(summary.decimals).to.equal(1);
    });
  });

  describe("getFeedback", function () {
    it("should return correct feedback by index", async function () {
      const hash = ethers.keccak256("0xdeadbeef");
      await reputation.connect(reviewer1).giveFeedback(
        1, 75, 0, tag("accuracy"), tag("latency"), "https://api.test/v1", hash
      );

      const fb = await reputation.getFeedback(1, 0);
      expect(fb.reviewer).to.equal(reviewer1.address);
      expect(fb.value).to.equal(75);
      expect(fb.tag1).to.equal(tag("accuracy"));
      expect(fb.endpointURI).to.equal("https://api.test/v1");
      expect(fb.payloadHash).to.equal(hash);
    });
  });
});
