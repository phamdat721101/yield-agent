/**
 * Trust Stamp script — signs a data hash with the agent's private key
 *
 * Usage:
 *   tsx sign-report.ts --hash "sha256:abcdef123..."
 */

import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { pinJSON } from "../../lib/ipfs.js";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../../.env" });

interface TrustStamp {
  dataHash: string;
  message: string;
  signature: string;
  signer: string;
  ipfsCid: string | null;
  timestamp: string;
}

async function main() {
  const args = process.argv.slice(2);
  const hashIdx = args.indexOf("--hash");
  if (hashIdx < 0) {
    console.error("Usage: tsx sign-report.ts --hash <sha256:...>");
    process.exit(1);
  }

  const dataHash = args[hashIdx + 1];
  const privateKey = process.env.AGENT_PRIVATE_KEY as Hex;
  if (!privateKey) throw new Error("AGENT_PRIVATE_KEY not set");

  const account = privateKeyToAccount(privateKey);
  const timestamp = new Date().toISOString();
  const message = `LionHeart TrustStamp | hash:${dataHash} | ts:${timestamp}`;

  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(process.env.ARBITRUM_SEPOLIA_RPC),
  });

  const signature = await walletClient.signMessage({ message });

  // Pin attestation to IPFS
  const attestation = {
    dataHash,
    message,
    signature,
    signer: account.address,
    timestamp,
  };

  let ipfsCid: string | null = null;
  try {
    const pinResult = await pinJSON(attestation);
    ipfsCid = pinResult.cid;
  } catch (err) {
    console.warn("IPFS pinning skipped:", (err as Error).message);
  }

  const result: TrustStamp = {
    dataHash,
    message,
    signature,
    signer: account.address,
    ipfsCid,
    timestamp,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
