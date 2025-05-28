// createSnipeTx.ts
import BN from "bn.js";
import { initSdk, txVersion } from "./config";
import { Keypair } from "@solana/web3.js";
import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CurveCalculator,
} from "@raydium-io/raydium-sdk-v2";

export async function createSnipeTx(
  poolInfo: any,
  poolKeys: any,
  inputMint: string,
  amountIn: number,
  amountOutMin: number,
  sniperWallet: Keypair // Each snipe transaction uses a dedicated wallet
) {
  // Create a wallet adapter from the keypair
  const walletAdapter = {
    publicKey: sniperWallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(sniperWallet);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map((tx) => {
        tx.partialSign(sniperWallet);
        return tx;
      });
    },
  };

  const raydium = await initSdk({
    loadToken: true,
    wallet: walletAdapter,
  });

  const inputAmount = new BN(amountIn * 10 ** poolInfo.baseDecimals);
  const baseIn = /* true if input is mintA */ true;
  const swapResult = CurveCalculator.swap(
    inputAmount,
    poolInfo.baseReserve,
    poolInfo.quoteReserve,
    poolInfo.configInfo.tradeFeeRate
  );

  const { transaction } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    inputAmount: new BN(amountIn * 10 ** poolInfo.baseDecimals),
    swapResult,
    slippage: 0.005,
    baseIn,
  });

  //   const { transaction } = await raydium.cpmm.swap({
  //     poolInfo,
  //     baseIn: inputMint, // Using baseMint instead of inputMint
  //     amountIn: new BN(amountIn * 10 ** poolInfo.quoteDecimals),
  //     amountOutMin: new BN(amountOutMin * 10 ** poolInfo.baseDecimals),
  //     ownerInfo: { useSOLBalance: true },
  //     txVersion,
  //   });

  // Ensure the transaction is signed by the sniper wallet
  if ("partialSign" in transaction) {
    transaction.partialSign(sniperWallet);
  } else {
    // For VersionedTransaction
    transaction.sign([sniperWallet]);
  }

  return transaction;
}
