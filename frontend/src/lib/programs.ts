export async function mintPassport(wallet: string): Promise<{ success: boolean; txHash: string }> {
  throw new Error(`RGP passport minting is not wired for ${wallet}. Deploy the devnet program and set VITE_RGP_PROGRAM_ID first.`)
}

export async function submitRecovery(
  wallet: string,
  guardians: string[]
): Promise<{ configHash: string }> {
  throw new Error(`RGP recovery is not wired for ${wallet} with ${guardians.length} guardians. Deploy the devnet program and set VITE_RGP_PROGRAM_ID first.`)
}
