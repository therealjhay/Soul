/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet",
    NEXT_PUBLIC_IDENTITY_PROGRAM_ID: process.env.NEXT_PUBLIC_IDENTITY_PROGRAM_ID || "",
    NEXT_PUBLIC_SBT_PROGRAM_ID: process.env.NEXT_PUBLIC_SBT_PROGRAM_ID || "",
    NEXT_PUBLIC_ATTESTATION_PROGRAM_ID: process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID || "",
    NEXT_PUBLIC_RGP_PROGRAM_ID: process.env.NEXT_PUBLIC_RGP_PROGRAM_ID || "",
  },
};

module.exports = nextConfig;
