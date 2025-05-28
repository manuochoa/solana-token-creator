// lib/token-transfer.ts
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

/**
 * Transfer tokens to a wallet, creating the token account if it doesn't exist
 * This is needed to fund the sniper wallets with the base token
 */
export async function transferTokens(
  connection: Connection,
  fromWallet: any, // Wallet adapter with signTransaction
  toPublicKey: PublicKey,
  mintAddress: string,
  amount: number,
  decimals: number
) {
  // Get the token account addresses
  const mint = new PublicKey(mintAddress);
  const fromTokenAccount = await getAssociatedTokenAddress(
    mint,
    fromWallet.publicKey
  );
  const toTokenAccount = await getAssociatedTokenAddress(mint, toPublicKey);

  // Check if the destination token account exists
  let account;
  try {
    account = await getAccount(connection, toTokenAccount);
  } catch (error) {
    // If the account doesn't exist, we'll create it
    account = null;
  }

  const transaction = new Transaction();

  // If the recipient token account doesn't exist, create it
  if (!account) {
    console.log(`Creating token account for ${toPublicKey.toString()}`);
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromWallet.publicKey, // payer
        toTokenAccount, // new associated token account
        toPublicKey, // owner
        mint // mint
      )
    );
  }

  // Add the transfer instruction
  transaction.add(
    createTransferInstruction(
      fromTokenAccount, // source
      toTokenAccount, // destination
      fromWallet.publicKey, // owner
      amount * 10 ** decimals // amount, adjusted for decimals
    )
  );

  // Set recent blockhash and fee payer
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet.publicKey;

  // Sign and send the transaction
  const signedTx = await fromWallet.signTransaction(transaction);
  const txId = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(txId);
  console.log(`Token transfer complete: ${txId}`);

  return txId;
}

/**
 * Check if wallet has a token account for the given mint
 */
export async function hasTokenAccount(
  connection: Connection,
  walletPublicKey: PublicKey,
  mintAddress: string
): Promise<boolean> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    );

    return tokenAccounts.value.some(
      (account) => account.account.data.parsed.info.mint === mintAddress
    );
  } catch (error) {
    console.error("Error checking token account:", error);
    return false;
  }
}

/**
 * Get token balance for a specific mint
 */
export async function getTokenBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  mintAddress: string
): Promise<number | null> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) }
    );

    const account = tokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === mintAddress
    );

    if (account) {
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
      return balance;
    }

    return null; // No account found
  } catch (error) {
    console.error("Error getting token balance:", error);
    return null;
  }
}
