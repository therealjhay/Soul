import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SoulboundIdentity", function () {
  async function deployFixture() {
    const [admin, user1, user2, operator] = await ethers.getSigners();
    const SoulboundIdentity = await ethers.getContractFactory("SoulboundIdentity");
    const identity = await SoulboundIdentity.deploy(admin.address);
    return { identity, admin, user1, user2, operator };
  }

  it("should register a new identity", async function () {
    const { identity, user1 } = await loadFixture(deployFixture);
    await expect(identity.connect(user1).registerIdentity("ipfs://metadata1"))
      .to.emit(identity, "IdentityRegistered")
      .withArgs(1n, user1.address, "ipfs://metadata1", await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    const id = await identity.getIdentityId(user1.address);
    expect(id).to.equal(1n);
  });

  it("should prevent double registration", async function () {
    const { identity, user1 } = await loadFixture(deployFixture);
    await identity.connect(user1).registerIdentity("ipfs://meta");
    await expect(identity.connect(user1).registerIdentity("ipfs://meta2"))
      .to.be.revertedWith("SoulboundIdentity: already registered");
  });

  it("should link and unlink wallets", async function () {
    const { identity, user1, user2 } = await loadFixture(deployFixture);
    await identity.connect(user1).registerIdentity("ipfs://meta");
    const identityId = await identity.getIdentityId(user1.address);
    await identity.connect(user2).linkWallet(identityId);
    expect(await identity.getIdentityId(user2.address)).to.equal(identityId);
    await identity.connect(user1).unlinkWallet(user2.address);
    expect(await identity.getIdentityId(user2.address)).to.equal(0n);
  });

  it("should update metadata", async function () {
    const { identity, user1 } = await loadFixture(deployFixture);
    await identity.connect(user1).registerIdentity("ipfs://old");
    await expect(identity.connect(user1).updateMetadata("ipfs://new"))
      .to.emit(identity, "MetadataUpdated");
    const id = await identity.getIdentityId(user1.address);
    const info = await identity.getIdentity(id);
    expect(info.metadataURI).to.equal("ipfs://new");
  });

  it("should deactivate identity (admin only)", async function () {
    const { identity, admin, user1 } = await loadFixture(deployFixture);
    await identity.connect(user1).registerIdentity("ipfs://meta");
    const id = await identity.getIdentityId(user1.address);
    await identity.connect(admin).deactivateIdentity(id);
    expect(await identity.isActive(id)).to.equal(false);
  });
});

describe("SoulboundToken", function () {
  async function deployFixture() {
    const [admin, issuer, holder, other] = await ethers.getSigners();
    const SBT = await ethers.getContractFactory("SoulboundToken");
    const sbt = await SBT.deploy(admin.address);
    const ISSUER_ROLE = await sbt.ISSUER_ROLE();
    await sbt.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
    return { sbt, admin, issuer, holder, other, ISSUER_ROLE };
  }

  it("should mint a soulbound token", async function () {
    const { sbt, issuer, holder } = await loadFixture(deployFixture);
    await expect(sbt.connect(issuer).mint(holder.address, "defi", "ipfs://cred1", 0))
      .to.emit(sbt, "SBTMinted")
      .withArgs(1n, holder.address, issuer.address, "defi", "ipfs://cred1", 0n, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    expect(await sbt.ownerOf(1n)).to.equal(holder.address);
  });

  it("should block transfers (soulbound)", async function () {
    const { sbt, issuer, holder, other } = await loadFixture(deployFixture);
    await sbt.connect(issuer).mint(holder.address, "defi", "ipfs://cred", 0);
    await expect(
      sbt.connect(holder).transferFrom(holder.address, other.address, 1n)
    ).to.be.revertedWith("SBT: soulbound tokens are non-transferable");
  });

  it("should revoke an SBT", async function () {
    const { sbt, issuer, holder } = await loadFixture(deployFixture);
    await sbt.connect(issuer).mint(holder.address, "dao", "ipfs://cred", 0);
    await expect(sbt.connect(issuer).revoke(1n))
      .to.emit(sbt, "SBTRevoked");
    expect(await sbt.isValid(1n)).to.equal(false);
  });

  it("should respect expiration", async function () {
    const { sbt, issuer, holder } = await loadFixture(deployFixture);
    const now = Math.floor(Date.now() / 1000);
    // expires 1 second in the future — time will advance past it
    await sbt.connect(issuer).mint(holder.address, "social", "ipfs://cred", now + 1);
    // Mine a block far in the future
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);
    expect(await sbt.isValid(1n)).to.equal(false);
  });
});

describe("AttestationRegistry", function () {
  async function deployFixture() {
    const [admin, treasury, userA, userB] = await ethers.getSigners();
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    const registry = await AttestationRegistry.deploy(admin.address, treasury.address);
    return { registry, admin, treasury, userA, userB };
  }

  it("should create an attestation", async function () {
    const { registry, userA } = await loadFixture(deployFixture);
    await expect(
      registry.connect(userA).attest(1n, 2n, 75, "defi", "ipfs://att1")
    ).to.emit(registry, "AttestationCreated");
    const id = await registry.getActiveAttestation(1n, 2n, "defi");
    expect(id).to.equal(1n);
  });

  it("should reject self-attestation", async function () {
    const { registry, userA } = await loadFixture(deployFixture);
    await expect(
      registry.connect(userA).attest(1n, 1n, 50, "defi", "ipfs://self")
    ).to.be.revertedWith("AttestationRegistry: self-attestation");
  });

  it("should reject invalid weight", async function () {
    const { registry, userA } = await loadFixture(deployFixture);
    await expect(
      registry.connect(userA).attest(1n, 2n, 0, "defi", "ipfs://att")
    ).to.be.revertedWith("AttestationRegistry: weight out of range");
  });

  it("should revoke an attestation", async function () {
    const { registry, userA } = await loadFixture(deployFixture);
    await registry.connect(userA).attest(1n, 2n, 50, "dao", "ipfs://att");
    await expect(registry.connect(userA).revokeAttestation(1n))
      .to.emit(registry, "AttestationRevoked");
    const att = await registry.getAttestation(1n);
    expect(att.revoked).to.equal(true);
  });
});

describe("ReputationAnchor", function () {
  async function deployFixture() {
    const [admin, anchorer, verifier] = await ethers.getSigners();
    const ReputationAnchor = await ethers.getContractFactory("ReputationAnchor");
    const anchor = await ReputationAnchor.deploy(admin.address, anchorer.address);
    return { anchor, admin, anchorer, verifier };
  }

  it("should anchor a Merkle root", async function () {
    const { anchor, anchorer } = await loadFixture(deployFixture);
    const root = ethers.keccak256(ethers.toUtf8Bytes("testRoot"));
    await expect(anchor.connect(anchorer).anchorRoot(root, "ipfs://epoch1"))
      .to.emit(anchor, "RootAnchored")
      .withArgs(1n, root, ethers.ZeroHash, "ipfs://epoch1", await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
    expect(await anchor.latestEpoch()).to.equal(1n);
  });

  it("should verify a Merkle proof", async function () {
    const { anchor, anchorer } = await loadFixture(deployFixture);
    const identityId = 42n;
    const context = "defi";
    const score = 850000n; // 0.85 scaled by 1e6

    // Build a minimal single-leaf Merkle tree
    const leaf = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "string", "uint256"],
        [identityId, context, score]
      )
    );
    // Single leaf tree: root = leaf, proof = []
    // But we need to use abi.encodePacked as the contract does:
    const leafPacked = ethers.keccak256(
      ethers.solidityPacked(["uint256", "string", "uint256"], [identityId, context, score])
    );

    await anchor.connect(anchorer).anchorRoot(leafPacked, "ipfs://epoch1");
    const valid = await anchor.verifyScore(identityId, context, score, []);
    expect(valid).to.equal(true);
  });

  it("should commit and verify individual score hashes", async function () {
    const { anchor, anchorer } = await loadFixture(deployFixture);
    const identityId = 1n;
    const context = "dao";
    const score = 700000n;
    const hash = ethers.keccak256(
      ethers.solidityPacked(["uint256", "string", "uint256"], [identityId, context, score])
    );
    await anchor.connect(anchorer).commitScores([identityId], [context], [hash]);
    expect(await anchor.verifyScoreCommitment(identityId, context, score)).to.equal(true);
  });
});
