import { AgentTool } from "../lib/tools.js";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { pinJSON } from "../lib/ipfs.js";
import { memory } from "../lib/memory.js";

/**
 * Trust Stamp Tool — signs data hashes with agent's private key
 *
 * Extracts logic from skills/trust-stamp/scripts/sign-report.ts
 * into the AgentTool pattern for router integration.
 */
export class TrustStampTool implements AgentTool {
    name = "trust-stamp";
    description =
        "Signs a data hash with the agent's ECDSA key and optionally pins to IPFS. Input: { dataHash: string }";

    async execute(input: any): Promise<any> {
        const dataHash = input.dataHash || input.hash || "no-hash-provided";
        const privateKey = process.env.AGENT_PRIVATE_KEY as Hex;

        if (!privateKey) {
            return {
                type: "Trust Stamp",
                error: "AGENT_PRIVATE_KEY not configured",
            };
        }

        try {
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
            } catch {
                // IPFS pinning is optional
            }

            memory.append(
                `Trust stamp: signed hash=${dataHash.slice(0, 20)}... by ${account.address.slice(0, 10)}...`
            );

            return {
                type: "Trust Stamp",
                dataHash,
                message,
                signature,
                signer: account.address,
                ipfsCid,
                timestamp,
            };
        } catch (err: any) {
            return {
                type: "Trust Stamp",
                error: "Signing failed",
                details: err.message,
            };
        }
    }
}
