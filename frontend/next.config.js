/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || "10143",
    NEXT_PUBLIC_IDENTITY_CONTRACT: process.env.NEXT_PUBLIC_IDENTITY_CONTRACT || "",
    NEXT_PUBLIC_SBT_CONTRACT: process.env.NEXT_PUBLIC_SBT_CONTRACT || "",
    NEXT_PUBLIC_ATTESTATION_CONTRACT: process.env.NEXT_PUBLIC_ATTESTATION_CONTRACT || "",
    NEXT_PUBLIC_ANCHOR_CONTRACT: process.env.NEXT_PUBLIC_ANCHOR_CONTRACT || "",
  },
};

module.exports = nextConfig;
