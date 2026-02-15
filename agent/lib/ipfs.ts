/**
 * IPFS pinning helper
 * Supports web3.storage in production and a mock mode for development.
 * Set IPFS_MOCK=true in env to skip actual pinning.
 */

import { createHash } from "node:crypto";

const MOCK_ENABLED = process.env.IPFS_MOCK === "true";

export interface PinResult {
  cid: string;
  url: string;
  mock: boolean;
}

/**
 * Pin JSON data to IPFS.
 * In mock mode, returns a deterministic fake CID based on content hash.
 */
export async function pinJSON(data: unknown): Promise<PinResult> {
  const json = JSON.stringify(data);
  const hash = createHash("sha256").update(json).digest("hex");

  if (MOCK_ENABLED) {
    const fakeCid = `bafkreig${hash.slice(0, 50)}`;
    return {
      cid: fakeCid,
      url: `https://w3s.link/ipfs/${fakeCid}`,
      mock: true,
    };
  }

  // Production: use web3.storage HTTP API
  const token = process.env.WEB3_STORAGE_TOKEN;
  if (!token) throw new Error("WEB3_STORAGE_TOKEN not set");

  const res = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: json,
  });

  if (!res.ok) {
    throw new Error(`web3.storage upload failed: ${res.status} ${await res.text()}`);
  }

  const result = await res.json();
  const cid = (result as any).cid;

  return {
    cid,
    url: `https://w3s.link/ipfs/${cid}`,
    mock: false,
  };
}

/** Compute SHA-256 hash of arbitrary data (for trust-stamp verification) */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
