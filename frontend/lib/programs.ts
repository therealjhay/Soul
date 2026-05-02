/**
 * On-chain program stubs for SOUL.
 * These are typed interfaces ready to be wired to real program IDLs.
 * Currently they log the call and return mock confirmations.
 */

export interface MintPassportResult {
  success: boolean;
  signature: string;
  passportAddress: string;
}

export interface SubmitRecoveryResult {
  success: boolean;
  signature: string;
  configHash: string;
}

/**
 * Mint a Reputation Passport NFT on-chain.
 * TODO: Replace stub with real IDL call when contracts/rgp-solana-program is deployed.
 */
export async function mintPassport(
  wallet: string,
  // connection: Connection  // uncomment when wiring real program
): Promise<MintPassportResult> {
  console.log("[programs] mintPassport stub called for wallet:", wallet);

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1500));

  const mockSig = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  const mockAddr = Array.from({ length: 44 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789"[
      Math.floor(Math.random() * 58)
    ]
  ).join("");

  return {
    success: true,
    signature: mockSig,
    passportAddress: mockAddr,
  };
}

/**
 * Submit guardian recovery configuration to the recovery-guard program.
 * TODO: Replace stub with real IDL call when recovery-guard program is deployed.
 */
export async function submitRecovery(
  wallet: string,
  guardians: string[],
  // connection: Connection  // uncomment when wiring real program
): Promise<SubmitRecoveryResult> {
  console.log("[programs] submitRecovery stub called:", { wallet, guardians });

  if (guardians.length !== 3) {
    throw new Error("Exactly 3 guardian addresses required");
  }

  // Simulate signing + network
  await new Promise((r) => setTimeout(r, 2000));

  const configHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  const sig = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return {
    success: true,
    signature: sig,
    configHash,
  };
}
