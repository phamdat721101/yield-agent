# Trust Stamp

## Description
Sign data hashes with the agent's private key to create verifiable trust stamps. Used to prove that research data was produced by this specific agent at a specific time.

## Trigger
Called automatically after market-research or daily-brief produces a data hash. Can also be invoked manually: "Sign this report."

## Steps
1. Receive a data hash (SHA-256) from a prior skill
2. Create a message: `LionHeart TrustStamp | hash:{dataHash} | ts:{timestamp}`
3. Sign message with agent's private key via viem `signMessage`
4. Optionally pin the signed attestation to IPFS
5. Return signature + attestation record

## Output Format
```json
{
  "dataHash": "sha256:...",
  "message": "LionHeart TrustStamp | hash:... | ts:...",
  "signature": "0x...",
  "signer": "0x...",
  "ipfsCid": "bafkrei...",
  "timestamp": "2025-01-01T00:00:00Z"
}
```
