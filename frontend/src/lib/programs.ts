// Mock program interactions — replace with real Anchor calls
export async function mintPassport(wallet: string): Promise<{ success: boolean; txHash: string }> {
  await new Promise(r => setTimeout(r, 1800))
  return { success: true, txHash: `${wallet.slice(0, 8)}...${Date.now().toString(16)}` }
}

export async function submitRecovery(
  wallet: string,
  guardians: string[]
): Promise<{ configHash: string }> {
  await new Promise(r => setTimeout(r, 2000))
  const hash = btoa(`${wallet}:${guardians.join(':')}`).slice(0, 32)
  return { configHash: hash }
}
