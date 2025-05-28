import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getMint,
} from "@solana/spl-token";
import {
  Liquidity,
  LiquidityPoolInitializeV4Params,
  Token,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import BN from "bn.js";

import {
  RAYDIUM_LIQUIDITY_PROGRAM_ID,
  RAYDIUM_SWAP_PROGRAM_ID,
  MARKET_PROGRAM_ID,
  SERUM_DEX_PROGRAM_ID,
} from "./constants";
import { sign } from "crypto";

export async function createLiquidityPool(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  tokenMint: PublicKey,
  tokenAmount: number,
  solAmount: number
): Promise<{ poolTx: Transaction; poolKeys: any }> {
  const tokenInfo = await getMint(
    connection,
    tokenMint,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  const tokenDecimals = tokenInfo.decimals;
  const solLamports = solAmount * LAMPORTS_PER_SOL;

  // Generate necessary keypairs
  const amm = Keypair.generate();
  const poolId = Keypair.generate();
  const lpMint = Keypair.generate();
  const lpVault = Keypair.generate();
  const baseVault = Keypair.generate();
  const quoteVault = Keypair.generate();
  const openOrders = Keypair.generate();
  const targetOrders = Keypair.generate();
  const withdrawQueue = Keypair.generate();
  const lpReserve = Keypair.generate();
  const marketId = Keypair.generate(); // Replace with real DEX market if needed

  const baseMint = tokenMint;
  const quoteMint = new PublicKey(
    "So11111111111111111111111111111111111111112"
  ); // Wrapped SOL

  const authority = (
    await PublicKey.findProgramAddress(
      [Buffer.from("amm authority")],
      RAYDIUM_SWAP_PROGRAM_ID
    )
  )[0];

  const baseDecimals = tokenDecimals;
  const quoteDecimals = 9;

  const userTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const userSOLAccount = await getAssociatedTokenAddress(
    quoteMint,
    wallet.publicKey,
    false
  );

  const transaction = new Transaction();

  const solAccountInfo = await connection.getAccountInfo(userSOLAccount);
  if (!solAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userSOLAccount,
        wallet.publicKey,
        quoteMint
      )
    );
  }

  const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
  if (!tokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userTokenAccount,
        wallet.publicKey,
        tokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: userSOLAccount,
      lamports: solLamports,
    }),
    createSyncNativeInstruction(userSOLAccount)
  );

  // Create user LP vault ATA and ensure it exists
  const userLpVault = await getAssociatedTokenAddress(
    lpMint.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const userLpVaultInfo = await connection.getAccountInfo(userLpVault);
  if (!userLpVaultInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userLpVault,
        wallet.publicKey,
        lpMint.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Prepare pool keys object
  const poolKeys = {
    id: poolId.publicKey,
    baseMint,
    quoteMint,
    lpMint: lpMint.publicKey,
    baseVault: baseVault.publicKey,
    quoteVault: quoteVault.publicKey,
    lpVault: lpVault.publicKey,
    openOrders: openOrders.publicKey,
    targetOrders: targetOrders.publicKey,
    authority,
    marketId: marketId.publicKey,
    marketProgramId: MARKET_PROGRAM_ID,
    programId: RAYDIUM_LIQUIDITY_PROGRAM_ID,
    serumProgramId: SERUM_DEX_PROGRAM_ID,
    ammId: amm.publicKey,
    ammProgramId: RAYDIUM_SWAP_PROGRAM_ID,
    withdrawQueue: withdrawQueue.publicKey,
    creator: wallet.publicKey,
  };

  // Now generate the pool creation instruction
  const { innerTransaction } = Liquidity.makeCreatePoolV4InstructionV2({
    programId: RAYDIUM_LIQUIDITY_PROGRAM_ID,
    ammId: amm.publicKey,
    ammAuthority: authority,
    ammOpenOrders: openOrders.publicKey,
    lpMint: lpMint.publicKey,
    coinMint: baseMint,
    pcMint: quoteMint,
    coinVault: baseVault.publicKey,
    pcVault: quoteVault.publicKey,
    ammTargetOrders: targetOrders.publicKey,
    marketProgramId: MARKET_PROGRAM_ID,
    marketId: marketId.publicKey,
    userWallet: wallet.publicKey,
    userCoinVault: userTokenAccount,
    userPcVault: userSOLAccount,
    userLpVault,
    ammConfigId: new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"),
    feeDestinationId: wallet.publicKey,
    nonce: 255, // placeholder — ensure proper nonce if needed
    openTime: new BN(Math.floor(Date.now() / 1000)),
    coinAmount: new BN(tokenAmount * 10 ** baseDecimals),
    pcAmount: new BN(solLamports),
  });

  for (const ix of innerTransaction.instructions) {
    transaction.add(ix);
  }

  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  // Add required keypair signatures
  //   transaction.partialSign(
  //     amm,
  //     poolId,
  //     lpMint,
  //     lpVault,
  //     baseVault,
  //     quoteVault,
  //     openOrders,
  //     targetOrders,
  //     withdrawQueue,
  //     lpReserve,
  //     marketId
  //   );

  //   const signedTransaction = await wallet.signTransaction(transaction);

  return { poolTx: transaction, poolKeys };

  //   return { transaction, poolKeys };
}
