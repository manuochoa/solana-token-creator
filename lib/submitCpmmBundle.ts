// submitCpmmBundle.ts
import { PublicKey } from "@solana/web3.js";
import { submitBundle } from "./jito";

export async function submitCpmmLaunchBundle(
  poolTx: any,
  addLiquidityTx: any,
  snipeTxs: any[],
  tipAccount: PublicKey = null,
  tipLamports = 10000000
) {
  const bundle = {
    // Order matters: first create pool, then add liquidity, then snipe
    transactions: [poolTx, addLiquidityTx, ...snipeTxs],
    uuid: `bundle-${Date.now()}`,
  };

  const result = await submitBundle(
    bundle,
    tipAccount || undefined,
    BigInt(tipLamports)
  );

  return result;
}
