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
  NATIVE_MINT,
  getMint,
} from "@solana/spl-token";
import {
  Liquidity,
  LiquidityPoolKeys,
  Token,
  TokenAmount,
  Percent,
} from "@raydium-io/raydium-sdk";

export async function createBuyTransaction(
  connection: Connection,
  wallet: Keypair,
  poolKeys: LiquidityPoolKeys,
  tokenMint: PublicKey,
  solAmount: number,
  slippage = 0.5
): Promise<Transaction> {
  const tokenInfo = await getMint(
    connection,
    tokenMint,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  const decimals = tokenInfo.decimals;

  const userTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const userSOLAccount = await getAssociatedTokenAddress(
    NATIVE_MINT,
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
        NATIVE_MINT
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

  // Wrap SOL
  const lamports = solAmount * LAMPORTS_PER_SOL;
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: userSOLAccount,
      lamports,
    }),
    createSyncNativeInstruction(userSOLAccount)
  );

  // QuoteMint is expected to be SOL (we're paying SOL to buy token)
  const amountIn = new TokenAmount(
    new Token(poolKeys.quoteMint, 9), // SOL always 9 decimals
    lamports
  );

  const slippageTolerance = new Percent(slippage * 100, 10000);

  // Prepare the actual Raydium swap instruction
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccountIn: userSOLAccount,
      tokenAccountOut: userTokenAccount,
      owner: wallet.publicKey,
    },
    amountIn,
    fixedSide: "in",
    slippage: slippageTolerance,
    makeTxVersion: 0,
  });

  for (const ix of innerTransactions[0].instructions) {
    transaction.add(ix);
  }

  // Unwrap remaining SOL
  transaction.add(
    createCloseAccountInstruction(
      userSOLAccount,
      wallet.publicKey,
      wallet.publicKey
    )
  );

  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  return transaction;
}
