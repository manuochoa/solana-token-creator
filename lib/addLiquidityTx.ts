// addLiquidityTx.ts
import BN from "bn.js";
import { initSdk, txVersion } from "./config";

export async function createAddLiquidityTx(
  poolInfo: any,
  baseAmount: number,
  quoteAmount: number,
  wallet: any // Pass the connected wallet
) {
  const raydium = await initSdk({
    loadToken: true,
    wallet, // Pass the wallet to the SDK
  });

  const { transaction } = await raydium.cpmm.addLiquidity({
    poolInfo,
    baseMint: poolInfo.baseMint,
    baseAmount: new BN(baseAmount * 10 ** poolInfo.baseDecimals),
    quoteMint: poolInfo.quoteMint,
    quoteAmount: new BN(quoteAmount * 10 ** poolInfo.quoteDecimals),
    fixedSide: "base",
    ownerInfo: { useSOLBalance: true },
    txVersion,
  });

  return transaction;
}
