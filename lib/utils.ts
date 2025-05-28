import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { SniperWallet, TransactionStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number to a readable string with number of decimal places
 *
 * @param num Number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format SOL amount to a readable string
 *
 * @param lamports Amount in lamports
 * @returns Formatted SOL string
 */
export function formatSol(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return `${formatNumber(sol)} SOL`;
}

/**
 * Shorten a public key or signature for display
 *
 * @param str Public key or signature string
 * @param start Characters to show at start
 * @param end Characters to show at end
 * @returns Shortened string
 */
export function shortenString(
  str: string,
  start: number = 4,
  end: number = 4
): string {
  if (!str) return "";
  if (str.length <= start + end) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

/**
 * Generate random sniper wallets with specified SOL distribution
 *
 * @param count Number of wallets to generate
 * @param totalSol Total SOL to distribute
 * @param distribution Percentage distribution array
 * @returns Array of SniperWallet objects
 */
export function generateSniperWallets(
  count: number,
  totalSol: number,
  distribution: number[]
): SniperWallet[] {
  // Validate distribution percentages
  const totalPercent = distribution.reduce((sum, percent) => sum + percent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(
      `Distribution percentages must sum to 100% (got ${totalPercent}%)`
    );
  }

  if (distribution.length !== count) {
    throw new Error(
      `Distribution array length (${distribution.length}) must match count (${count})`
    );
  }

  return Array(count)
    .fill(0)
    .map((_, i) => {
      const percentage = distribution[i];
      const solAmount = (totalSol * percentage) / 100;

      return {
        keypair: Keypair.generate(),
        solAmount,
        percentage,
        status: TransactionStatus.PENDING,
      };
    });
}

/**
 * Create funding transactions for sniper wallets
 *
 * @param connection Solana connection
 * @param fromWallet Source wallet public key
 * @param sniperWallets Array of sniper wallets to fund
 * @param extraLamports Extra lamports to add for fees (default 0.01 SOL)
 * @returns Transaction to fund all wallets
 */
export async function createFundingTransaction(
  connection: Connection,
  fromWallet: PublicKey,
  sniperWallets: SniperWallet[],
  extraLamports: number = 10_000_000 // 0.01 SOL for fees
): Promise<Transaction> {
  const tx = new Transaction();

  for (const wallet of sniperWallets) {
    const lamports =
      Math.floor(wallet.solAmount * LAMPORTS_PER_SOL) + extraLamports;

    tx.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet,
        toPubkey: wallet.keypair.publicKey,
        lamports,
      })
    );
  }

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = fromWallet;

  return tx;
}

/**
 * Parse wallet private keys from string
 *
 * @param keysString String containing JSON arrays of private keys (one per line)
 * @returns Array of Keypair objects
 */
export function parseWalletKeysFromString(keysString: string): Keypair[] {
  if (!keysString.trim()) {
    return [];
  }

  const keys = keysString.split("\n").filter((key) => key.trim());

  return keys.map((key) => {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key.trim())));
    } catch (e) {
      throw new Error(`Invalid wallet key format: ${e.message}`);
    }
  });
}

/**
 * Export wallet keypairs as a string
 *
 * @param wallets Array of SniperWallet objects
 * @returns String with JSON arrays of private keys (one per line)
 */
export function exportWalletKeysToString(wallets: SniperWallet[]): string {
  return wallets
    .map((wallet) => JSON.stringify(Array.from(wallet.keypair.secretKey)))
    .join("\n");
}

/**
 * Calculate estimated price impact of a swap
 *
 * @param inputAmount Input amount (e.g., SOL amount)
 * @param poolLiquidity Total pool liquidity in the input token
 * @returns Estimated price impact as a percentage
 */
export function calculatePriceImpact(
  inputAmount: number,
  poolLiquidity: number
): number {
  if (poolLiquidity <= 0) return 100;

  // Simple estimate based on the ratio of input to pool liquidity
  // More accurate calculations would use the AMM formula
  const impact = (inputAmount / (poolLiquidity + inputAmount)) * 100;
  return Math.min(impact, 100);
}

/**
 * Get explorer URL for a transaction
 *
 * @param signature Transaction signature
 * @param cluster Solana cluster (mainnet, devnet, testnet)
 * @returns Explorer URL
 */
export function getExplorerUrl(
  signature: string,
  cluster: "mainnet" | "devnet" | "testnet" = "mainnet"
): string {
  const baseUrl = "https://explorer.solana.com";
  const clusterParam = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  return `${baseUrl}/tx/${signature}${clusterParam}`;
}
