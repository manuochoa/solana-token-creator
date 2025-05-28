import { Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";
import { DEFAULT_JITO_TIP_ACCOUNT, JITO_SEARCHER_API_URL } from "./constants";
import axios from "axios";

/**
 * Bundle interface for Jito API
 */
export interface Bundle {
  transactions: (Transaction | VersionedTransaction)[];
  isRequired: boolean[];
}

/**
 * Bundle UUID interface for Jito API
 */
export type BundleUuid = string;

/**
 * Result of bundle submission
 */
export interface BundleResult {
  bundle_id: string;
  status: string;
}

/**
 * Create a new bundle with the given transactions
 *
 * @param requiredTx Required transaction that must succeed
 * @param optionalTxs Optional transactions that can fail
 * @returns Bundle object ready for submission
 */
export function createJitoBundle(
  requiredTx: Transaction | VersionedTransaction,
  optionalTxs: Array<Transaction | VersionedTransaction> = []
): Bundle {
  const transactions = [requiredTx, ...optionalTxs];
  const isRequired = [true, ...optionalTxs.map(() => false)];

  return {
    transactions,
    isRequired,
  };
}

/**
 * Serialize a transaction for submission to Jito API
 *
 * @param tx Transaction to serialize
 * @returns Base64 encoded serialized transaction
 */
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

/**
 * Submit a bundle to Jito
 *
 * @param bundle Bundle to submit
 * @param tipAccount Account to pay tips from (defaults to constant)
 * @param tipLamports Amount of lamports to tip (default 0.01 SOL)
 * @param apiUrl Jito API URL (defaults to constant)
 * @param apiKey Optional API key for authentication
 * @returns Result of bundle submission
 */
export async function submitBundle(
  bundle: Bundle,
  tipAccount: PublicKey = DEFAULT_JITO_TIP_ACCOUNT,
  tipLamports: bigint = BigInt(10000000), // 0.01 SOL default
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<BundleResult> {
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

/**
 * Check the status of a previously submitted bundle
 *
 * @param bundleUuid UUID of the bundle to check
 * @param apiUrl Jito API URL (defaults to constant)
 * @param apiKey Optional API key for authentication
 * @returns Bundle status
 */
export async function checkBundleStatus(
  bundleUuid: BundleUuid,
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<string> {
  try {
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["x-jito-auth"] = apiKey;
    }

    // Send request to check bundle status
    const response = await axios.post(
      `${apiUrl}/bundles`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getInflightBundleStatuses",
        params: [[bundleUuid]],
      },
      { headers }
    );

    // Extract status from response
    const result = response.data.result;
    if (result && result.value && result.value.length > 0) {
      return result.value[0].status;
    }

    return "unknown";
  } catch (error) {
    console.error("Error checking bundle status:", error);
    return "unknown";
  }
}

/**
 * Monitor a bundle until it's confirmed or fails
 *
 * @param bundleUuid UUID of the bundle to monitor
 * @param onStatusChange Callback for status changes
 * @param maxAttempts Maximum number of status check attempts
 * @param interval Interval between status checks in ms
 * @param apiUrl Jito API URL (defaults to constant)
 * @param apiKey Optional API key for authentication
 * @returns Final bundle status
 */
export async function monitorBundleUntilComplete(
  bundleUuid: BundleUuid,
  onStatusChange: (status: string) => void,
  maxAttempts: number = 30,
  interval: number = 2000,
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<string> {
  let attempts = 0;
  let lastStatus = "";

  while (attempts < maxAttempts) {
    const status = await checkBundleStatus(bundleUuid, apiUrl, apiKey);

    // If status changed, call the callback
    if (status !== lastStatus) {
      lastStatus = status;
      onStatusChange(status);
    }

    // If terminal status, exit loop
    if (status === "Landed" || status === "Failed" || status === "Invalid") {
      return status;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }

  return "timeout";
}

/**
 * Get tip accounts from Jito API
 *
 * @param apiUrl Jito API URL (defaults to constant)
 * @param apiKey Optional API key for authentication
 * @returns Array of tip account public keys
 */
export async function getTipAccounts(
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<PublicKey[]> {
  try {
    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["x-jito-auth"] = apiKey;
    }

    // Send request to get tip accounts
    const response = await axios.post(
      `${apiUrl}/bundles`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getTipAccounts",
        params: [],
      },
      { headers }
    );

    // Extract tip accounts from response
    const tipAccounts = response.data.result.map(
      (account: string) => new PublicKey(account)
    );

    return tipAccounts;
  } catch (error) {
    console.error("Error getting tip accounts:", error);
    // Return default tip account if API call fails
    return [DEFAULT_JITO_TIP_ACCOUNT];
  }
}

/**
 * Send a single transaction with Jito protection
 *
 * @param tx Transaction to send
 * @param apiUrl Jito API URL (defaults to constant)
 * @param apiKey Optional API key for authentication
 * @returns Transaction signature
 */
export async function sendProtectedTransaction(
  tx: Transaction | VersionedTransaction,
  apiUrl: string = JITO_SEARCHER_API_URL,
  apiKey?: string
): Promise<string> {
  try {
    // Serialize transaction to base64
    const serializedTx = serializeTransaction(tx);

    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["x-jito-auth"] = apiKey;
    }

    // Send transaction to Jito API
    const response = await axios.post(
      `${apiUrl}/transactions`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [
          serializedTx,
          {
            encoding: "base64",
          },
        ],
      },
      { headers }
    );

    // Extract transaction signature from response
    return response.data.result;
  } catch (error) {
    console.error("Error sending protected transaction:", error);
    throw new Error(`Failed to send transaction: ${error.message}`);
  }
}

/**
 * Helper to extract transaction signatures from a bundle status
 *
 * @param bundleStatus Bundle status response from Jito API
 * @returns Map of transaction indices to signatures
 */
export function extractSignaturesFromBundle(
  bundleStatus: any
): Map<number, string> {
  const signatures = new Map<number, string>();

  if (
    bundleStatus &&
    bundleStatus.value &&
    bundleStatus.value.length > 0 &&
    bundleStatus.value[0].transactions
  ) {
    bundleStatus.value[0].transactions.forEach(
      (signature: string, index: number) => {
        signatures.set(index, signature);
      }
    );
  }

  return signatures;
}
