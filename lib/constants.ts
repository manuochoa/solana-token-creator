import { PublicKey } from "@solana/web3.js";

// API endpoints
export const RAYDIUM_API = "https://api.raydium.io/v2/main/pools";
export const ORCA_WHIRLPOOLS_API =
  "https://api.mainnet.orca.so/v1/whirlpool/list";

// Jito configuration
export const JITO_SEARCHER_API_URL =
  "https://mainnet.block-engine.jito.wtf/api/v1";
export const DEFAULT_JITO_TIP_ACCOUNT = new PublicKey(
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
);

// Program IDs
export const RAYDIUM_SWAP_PROGRAM_ID = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
export const RAYDIUM_LIQUIDITY_PROGRAM_ID = new PublicKey(
  "9rpQHSyFVM1dkkHFQ2TtTzPEW7DVmEyPmN8wVniqJbYQ"
);
export const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey(
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
);
export const SERUM_DEX_PROGRAM_ID = new PublicKey(
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
);
export const MARKET_PROGRAM_ID = new PublicKey(
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"
);

// Constants for token-launcher
export const LIQUIDITY_STATE_LAYOUT_V4_SIZE = 1728;
export const MINIMUM_LIQUIDITY = 1000;

// Fee constants
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5; // 0.5%
export const DEFAULT_JITO_TIP_LAMPORTS = 10_000_000; // 0.01 SOL
