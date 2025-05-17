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
  createInitializeTransferFeeConfigInstruction,
  createSetTransferFeeInstruction,
  getMint,
  getTransferFeeConfig,
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
  const mintLen = getMintLen([
    ExtensionType.MetadataPointer,
    ExtensionType.TransferFeeConfig,
  ]);
  const totalSize = mintLen + metadataExtensionSize + metadataLen;
  const lamports = await connection.getMinimumBalanceForRentExemption(
    totalSize
  );

  const feeBasisPoints = 10; // 0.1% = 10 basis points (1 basis point = 0.01%)
  const maxFee = BigInt(100000000000000); //100 million tokens

  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Initialize transfer fee extension
    createInitializeTransferFeeConfigInstruction(
      mint,
      mintAuthority,
      mintAuthority, // transfer fee config authority
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
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

export async function changeTransferFee(
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  connection: Connection,
  mintAddress: string,
  newFeeBasisPoints: number,
  newMaxFee: bigint
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Validate fee parameters
    if (newFeeBasisPoints < 0 || newFeeBasisPoints > 10000) {
      throw new Error(
        "Fee basis points must be between 0 and 10000 (0% to 100%)"
      );
    }

    const mintPublicKey = new PublicKey(mintAddress);
    const transaction = new Transaction();

    // Add instruction to set new transfer fee
    transaction.add(
      createSetTransferFeeInstruction(
        mintPublicKey,
        wallet.publicKey, // transfer fee config authority
        wallet.publicKey, // withdraw withheld authority (can be different)
        newFeeBasisPoints,
        newMaxFee,
        TOKEN_2022_PROGRAM_ID
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

    console.log(`Transfer fee updated for token: ${mintAddress}`);
    console.log(
      `New fee: ${newFeeBasisPoints} basis points (${newFeeBasisPoints / 100}%)`
    );
    console.log(`New max fee: ${newMaxFee.toString()}`);
    console.log(`Transaction signature: ${signature}`);

    return signature;
  } catch (error) {
    console.error("Error changing transfer fee:", error);
    throw error;
  }
}

// Helper function to get current transfer fee configuration
export async function getTokenTransferFeeConfig(
  connection: Connection,
  mintAddress: string
): Promise<{
  transferFeeBasisPoints: number;
  maximumFee: bigint;
  transferFeeConfigAuthority: PublicKey | null;
  withdrawWithheldAuthority: PublicKey | null;
} | null> {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintAccount = await getMint(
      connection,
      mintPublicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const transferFeeConfig = getTransferFeeConfig(mintAccount);
    if (!transferFeeConfig) {
      return null;
    }

    return {
      transferFeeBasisPoints:
        transferFeeConfig.newerTransferFee.transferFeeBasisPoints,
      maximumFee: transferFeeConfig.newerTransferFee.maximumFee,
      transferFeeConfigAuthority: transferFeeConfig.transferFeeConfigAuthority,
      withdrawWithheldAuthority: transferFeeConfig.withdrawWithheldAuthority,
    };
  } catch (error) {
    console.error("Error getting transfer fee config:", error);
    return null;
  }
}

// Function to revoke transfer fee config authority (makes fee unchangeable)
export async function revokeTransferFeeAuthority(
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

    // Revoke transfer fee config authority
    transaction.add(
      createSetAuthorityInstruction(
        mintPublicKey,
        wallet.publicKey, // current authority
        AuthorityType.TransferFeeConfig,
        null, // new authority (null = revoke)
        [],
        TOKEN_2022_PROGRAM_ID
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

    console.log(`Transfer fee authority revoked for token: ${mintAddress}`);
    console.log(`Transaction signature: ${signature}`);

    return signature;
  } catch (error) {
    console.error("Error revoking transfer fee authority:", error);
    throw error;
  }
}
