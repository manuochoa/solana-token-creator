import { PublicKey, Transaction, Keypair } from "@solana/web3.js";

/**
 * Liquidity pool creation parameters
 */
export interface PoolCreationParams {
  tokenMint: PublicKey;
  tokenAmount: number;
  solAmount: number;
  slippage: number;
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

/**
 * Transaction type enum
 */
export enum TransactionType {
  POOL = "pool",
  BUY = "buy",
}

/**
 * Transaction information
 */
export interface TransactionInfo {
  signature: string;
  status: TransactionStatus;
  type: TransactionType;
  walletIndex?: number;
  timestamp?: number;
}

/**
 * Sniper wallet configuration
 */
export interface SniperWallet {
  keypair: Keypair;
  solAmount: number;
  percentage: number;
  transaction?: Transaction;
  signature?: string;
  status?: TransactionStatus;
}

/**
 * AMM Type enum
 */
export enum AmmType {
  RAYDIUM = "raydium",
  ORCA = "orca",
}

/**
 * Launch configuration
 */
export interface LaunchConfig {
  tokenMint: PublicKey;
  tokenAmount: number;
  solAmount: number;
  ammType: AmmType;
  sniperWallets: SniperWallet[];
  totalSniperSol: number;
  useMev: boolean;
  jitoTipLamports: number;
  snipeDelay: number;
  slippage: number;
}

/**
 * Bundle status
 */
export interface BundleStatus {
  uuid: string;
  status: string;
  transactions: TransactionInfo[];
  timestamp: number;
}

/**
 * Token pricing information
 */
export interface TokenPrice {
  mint: string;
  solPrice: number; // Price in SOL
  usdPrice: number; // Price in USD
  supply: string; // Total supply as string (to handle BigInt)
  liquidity: number; // Total liquidity in USD
  volume24h?: number; // 24h volume in USD
}

/**
 * Token metadataExt
 */
export interface TokenMetadataExt {
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  address: string;
  tags?: string[];
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    github?: string;
    discord?: string;
    medium?: string;
  };
}
