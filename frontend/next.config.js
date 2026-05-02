/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet",
    NEXT_PUBLIC_IDENTITY_PROGRAM_ID: process.env.NEXT_PUBLIC_IDENTITY_PROGRAM_ID || "",
    NEXT_PUBLIC_SBT_PROGRAM_ID: process.env.NEXT_PUBLIC_SBT_PROGRAM_ID || "",
    NEXT_PUBLIC_ATTESTATION_PROGRAM_ID: process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID || "",
    NEXT_PUBLIC_RGP_PROGRAM_ID: process.env.NEXT_PUBLIC_RGP_PROGRAM_ID || "",
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };
    return config;
  },
};

module.exports = nextConfig;
