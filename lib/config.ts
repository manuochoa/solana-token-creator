// config.ts
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import { TxVersion, Raydium } from "@raydium-io/raydium-sdk-v2";

// Default to devnet for safety
export const CLUSTER_URL =
  process.env.NEXT_PUBLIC_CLUSTER_URL ||
  "https://proud-soft-emerald.solana-mainnet.quiknode.pro/63e220c97a3db24e0826c67770818749f32d804e";
//   process.env.NEXT_PUBLIC_CLUSTER_URL || "https://api.devnet.solana.com";
export const txVersion = TxVersion.LEGACY;

// Initialize the SDK with a specific wallet
export async function initSdk(options: {
  loadToken?: boolean;
  wallet?: Wallet | Keypair | { publicKey: PublicKey; signTransaction: any };
}) {
  const { loadToken = false, wallet } = options;

  // Create a connection
  const connection = new Connection(CLUSTER_URL);

  //   // Initialize the SDK with connection and optional wallet
  //   const sdk = new SDK({
  //     connection,
  //     wallet: wallet || null, // Allow null for read-only operations
  //     loadToken,
  //   });

  //   await sdk.init();
  //   return sdk;

  const cluster =
    "https://proud-soft-emerald.solana-mainnet.quiknode.pro/63e220c97a3db24e0826c67770818749f32d804e/";

  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`);

  console.log("wallet", wallet);

  const raydium = await Raydium.load({
    connection,

    blockhashCommitment: "finalized",
    ...(wallet &&
      wallet.signAllTransactions && {
        signAllTransactions: wallet.signAllTransactions,
      }),
    // urlConfigs: {
    //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
    // },
  });

  raydium.setOwner(wallet.publicKey);

  return raydium;
}

// Utility function to create a wallet adapter from a keypair
export function createWalletAdapter(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map((tx) => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
}
