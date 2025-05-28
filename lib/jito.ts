// lib/jito.ts
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { createJitoClient } from "@jito-foundation/jito-ts";
import { DEFAULT_JITO_TIP_ACCOUNT, JITO_SEARCHER_API_URL } from "./constants";
import axios from "axios";

export interface JitoBundle {
  transactions: VersionedTransaction[];
  uuid?: string;
}

// export async function submitBundle(
//   bundle: JitoBundle,
//   feePayer: PublicKey,
//   tipLamports: bigint
// ): Promise<{ uuid: string; status: string }> {
//   const client = createJitoClient("https://mainnet.block-engine.jito.wtf", "mainnet-beta");

//   const result = await client.sendBundle({
//     bundle: {
//       transactions: bundle.transactions.map(tx => tx.serialize()),
//     },
//     tip: tipLamports,
//   });

//   return {
//     uuid: bundle.uuid || `bundle-${Date.now()}`,
//     status: result.status || "submitted",
//   };
// }

function serializeTransaction(tx: Transaction | VersionedTransaction): string {
  const serialized =
    tx instanceof VersionedTransaction
      ? tx.serialize()
      : tx.serialize({
          requireAllSignatures: true,
          verifySignatures: true,
        });

  return Buffer.from(serialized).toString("base64");
}

export async function submitBundle(
  bundle: JitoBundle,
  tipAccount: PublicKey = DEFAULT_JITO_TIP_ACCOUNT,
  tipLamports: bigint = BigInt(10000000), // 0.01 SOL default
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<{ uuid: string; status: string }> {
  try {
    // Serialize all transactions to base64
    const serializedTxs = bundle.transactions.map((tx) =>
      serializeTransaction(tx)
    );

    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["x-jito-auth"] = apiKey;
    }

    // Send bundle to Jito API
    const response = await axios.post(
      `${apiUrl}/bundles`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [
          serializedTxs,
          {
            encoding: "base64",
          },
        ],
      },
      { headers }
    );

    // Extract bundle ID from response
    const bundleId = response.data.result;

    return {
      bundle_id: bundleId,
      status: "submitted",
    };
  } catch (error) {
    console.error("Error submitting bundle to Jito API:", error);
    throw new Error(`Failed to submit bundle: ${error.message}`);
  }
}
