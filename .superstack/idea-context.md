# Idea Context

## Idea

Soulbound reputation graph protocol on Solana with SBT attestations, identity, zk proofs, and Sybil-resistant scoring.

## Landscape

```json
{
  "direct_competitors": [
    {
      "name": "Solana Attestation Service",
      "url": "https://attest.solana.com/",
      "status": "live",
      "strength": "Canonical Solana attestation primitive with credentials, schemas, authorized signers, and on-chain attestations.",
      "weakness": "Infrastructure primitive rather than full reputation graph or zk score protocol."
    },
    {
      "name": "Civic Pass",
      "url": "https://www.civic.com/",
      "status": "live",
      "strength": "Strong Solana identity, verification, proof-of-personhood, and Sybil gating footprint.",
      "weakness": "More access/compliance focused than open reputation graph."
    },
    {
      "name": "Solana ID",
      "url": "https://attest.solana.com/use-cases/solana-id",
      "status": "live/emerging",
      "strength": "Solana identity and on-chain behavior/data targeting angle.",
      "weakness": "Not clearly an open zk reputation graph protocol."
    },
    {
      "name": "Solid Labs",
      "url": "https://attest.solana.com/use-cases/solid",
      "status": "emerging",
      "strength": "Solana identity passport, attestations, selective disclosure, reputation score concepts.",
      "weakness": "Product maturity and developer adoption still unclear."
    },
    {
      "name": "Trusta Labs",
      "url": "https://www.trustalabs.ai/",
      "status": "live",
      "strength": "AI and knowledge-graph Sybil detection, behavior fingerprints, wallet scoring, attestation services.",
      "weakness": "More analytics/provider network than neutral Solana-native protocol."
    }
  ],
  "substitutes": [
    {
      "name": "Human Passport",
      "approach": "Stamps, ML models, data services, zk identity, and unique humanity scoring.",
      "why_users_stay": "Battle-tested for grants/airdrops and easy API integration."
    },
    {
      "name": "World ID",
      "approach": "ZK proof of unique human with nullifiers and verification levels.",
      "why_users_stay": "Strong uniqueness signal with global consumer distribution."
    },
    {
      "name": "Galxe Identity / Passport",
      "approach": "ZK identity, verifiable credentials, SBT passport, campaign/quest distribution.",
      "why_users_stay": "Large growth/quest ecosystem and compliance-oriented passport."
    },
    {
      "name": "Ethereum Attestation Service",
      "approach": "Open EVM attestation schemas and on/off-chain attestations.",
      "why_users_stay": "Large EVM ecosystem and simple neutral primitive."
    },
    {
      "name": "BrightID",
      "approach": "Social graph proof-of-uniqueness.",
      "why_users_stay": "Privacy-first and non-KYC uniqueness model."
    },
    {
      "name": "Traditional KYC / fraud vendors",
      "approach": "Centralized identity checks, device fingerprinting, fraud scoring.",
      "why_users_stay": "Compliance certainty, enterprise procurement, and familiar operations."
    }
  ],
  "dead_projects": [
    {
      "name": "Sismo",
      "why_failed": "Ceased operations despite strong ZK badge/reputation thesis; lesson is that infrastructure-only identity/reputation can struggle with monetization, distribution, and operational sustainability."
    }
  ],
  "crowdedness": "moderate",
  "moat_type": "network/data moat plus developer distribution",
  "differentiation": "Build on Solana Attestation Service rather than replacing it; own the graph scoring, Sybil economics, score-root commitments, zk threshold proofs, and app-facing reputation APIs."
}
```
