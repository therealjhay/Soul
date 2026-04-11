import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Deploy SoulboundIdentity
  const SoulboundIdentity = await ethers.getContractFactory("SoulboundIdentity");
  const identity = await SoulboundIdentity.deploy(deployer.address);
  await identity.waitForDeployment();
  console.log("SoulboundIdentity deployed to:", await identity.getAddress());

  // 2. Deploy SoulboundToken
  const SoulboundToken = await ethers.getContractFactory("SoulboundToken");
  const sbt = await SoulboundToken.deploy(deployer.address);
  await sbt.waitForDeployment();
  console.log("SoulboundToken deployed to:", await sbt.getAddress());

  // 3. Deploy AttestationRegistry (using deployer as treasury for now)
  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestation = await AttestationRegistry.deploy(deployer.address, deployer.address);
  await attestation.waitForDeployment();
  console.log("AttestationRegistry deployed to:", await attestation.getAddress());

  // 4. Deploy ReputationAnchor
  const ReputationAnchor = await ethers.getContractFactory("ReputationAnchor");
  const anchor = await ReputationAnchor.deploy(deployer.address, deployer.address);
  await anchor.waitForDeployment();
  console.log("ReputationAnchor deployed to:", await anchor.getAddress());

  console.log("\nDeployment complete.");
  console.log({
    SoulboundIdentity: await identity.getAddress(),
    SoulboundToken: await sbt.getAddress(),
    AttestationRegistry: await attestation.getAddress(),
    ReputationAnchor: await anchor.getAddress(),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
