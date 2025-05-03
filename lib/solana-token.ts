import {
  type Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
  createUpdateAuthorityInstruction,
} from "@solana/spl-token-metadata";

export async function revokeMintAuthority(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  mintAddress: string
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const mintPublicKey = new PublicKey(mintAddress);
    const transaction = new Transaction();

    transaction.add(
      createSetAuthorityInstruction(
        mintPublicKey, // mint account
        wallet.publicKey, // current authority
        AuthorityType.MintTokens, // authority type to update
        null, // new authority (null = revoke)
        [], // multisig signers (empty in this case)
        TOKEN_2022_PROGRAM_ID // program ID
      )
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    console.log(`Mint authority revoked for token: ${mintAddress}`);
    console.log(`Transaction signature: ${signature}`);

    return signature;
  } catch (error) {
    console.error("Error revoking mint authority:", error);
    throw error;
  }
}

export async function revokeMetadataUpdateAuthority(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  mintAddress: string
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const mintPublicKey = new PublicKey(mintAddress);
    const transaction = new Transaction();

    transaction.add(
      createUpdateAuthorityInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mintPublicKey,
        oldAuthority: wallet.publicKey, // current update authority
        newAuthority: null, // new authority (null = revoke)
      })
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTransaction = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });

    console.log(`Metadata update authority revoked for token: ${mintAddress}`);
    console.log(`Transaction signature: ${signature}`);

    return signature;
  } catch (error) {
    console.error("Error revoking metadata update authority:", error);
    throw error;
  }
}

export async function createToken(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  name: string,
  symbol: string,
  metadataUri: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const decimals = 6;
  const payer = wallet.publicKey;
  const mintAuthority = wallet.publicKey;
  const updateAuthority = wallet.publicKey;

  const metaData: TokenMetadata = {
    mint,
    name,
    symbol,
    uri: metadataUri,
    updateAuthority,
    additionalMetadata: Object.entries(metadata),
  };

  const metadataExtensionSize = TYPE_SIZE + LENGTH_SIZE;
  const metadataLen = pack(metaData).length;
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const totalSize = mintLen + metadataExtensionSize + metadataLen;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    totalSize
  );

  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint,
      updateAuthority,
      mint,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mint,
      decimals,
      mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      metadata: mint,
      updateAuthority,
      mint,
      mintAuthority,
      name,
      symbol,
      uri: metadataUri,
    }),
    ...Object.entries(metadata).map(([key, value]) =>
      createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: mint,
        updateAuthority,
        field: key,
        value: value,
      })
    ),
  ];

  const transaction = new Transaction().add(...instructions);
  transaction.feePayer = payer;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  transaction.partialSign(mintKeypair);
  const signedTx = await wallet.signTransaction(transaction);

  const signature = await connection.sendRawTransaction(signedTx.serialize());
  await connection.confirmTransaction(signature);

  console.log(`Token created successfully: ${mint.toBase58()}`);
  console.log(`Token includes file metadata field to prevent warnings`);

  return mint.toBase58();
}

export async function mintTokens(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  mintAddress: string,
  recipients: Array<{ wallet: string; amount: string }>
): Promise<void> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    const mintPublicKey = new PublicKey(mintAddress);

    const BATCH_SIZE = 10;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const transaction = new Transaction();

      for (const recipient of batch) {
        const recipientPublicKey = new PublicKey(recipient.wallet);

        const associatedTokenAddress = await getAssociatedTokenAddress(
          mintPublicKey,
          recipientPublicKey,
          false, // allowOwnerOffCurve
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const tokenAccountInfo = await connection.getAccountInfo(
          associatedTokenAddress
        );

        if (!tokenAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              associatedTokenAddress,
              recipientPublicKey,
              mintPublicKey,
              TOKEN_2022_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        transaction.add(
          createMintToInstruction(
            mintPublicKey,
            associatedTokenAddress,
            wallet.publicKey,
            BigInt(recipient.amount * 10 ** 6),
            [],
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
    }
  } catch (error) {
    console.error("Error minting tokens:", error);
    throw error;
  }
}
