// createPoolTx.ts
import { initSdk, txVersion } from "./config";
import BN from "bn.js";
import {
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
  DEVNET_PROGRAM_ID,
  getCpmmPdaAmmConfigId,
  // getCpmmInitializePoolInstruction,
  makeCreateCpmmPoolInInstruction,
} from "@raydium-io/raydium-sdk-v2";
import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CurveCalculator,
} from "@raydium-io/raydium-sdk-v2";
// (adjust the import path if your setup differs)

export function buildCpmmPoolKeys(createResult): CpmmKeys {
  const addr = createResult.extInfo.address;
  return {
    ammId: new PublicKey(addr.poolId),
    ammConfig: new PublicKey(addr.configId),
    ammAuthority: new PublicKey(addr.authority),
    baseVault: new PublicKey(addr.vaultA),
    quoteVault: new PublicKey(addr.vaultB),
    lpMint: new PublicKey(addr.lpMint),
    observationId: new PublicKey(addr.observationId),
    poolFeeAccount: new PublicKey(addr.poolFeeAccount),
    programId: new PublicKey(addr.programId),
    // openTime isn’t part of CpmmKeys, but the SDK uses startTime from extInfo.args
  };
}

export function buildCpmmPoolInfo(
  createResult,
  // these were your seed amounts in the createPool call:
  baseReserve: BN,
  quoteReserve: BN
): ApiV3PoolInfoStandardItemCpmm {
  const { address: addr, feeConfig } = createResult.extInfo;
  const { mintA, mintB, feeConfig: cfg } = addr;

  return {
    id: addr.poolId,
    programId: addr.programId,
    version: 2,
    status: "active",
    openTime: new BN(0),
    feeReceiver: addr.poolFeeAccount,

    mintA: {
      address: mintA.address,
      decimals: mintA.decimals,
      symbol: mintA.symbol,
      name: mintA.name,
    },
    mintB: {
      address: mintB.address,
      decimals: mintB.decimals,
      symbol: mintB.symbol,
      name: mintB.name,
    },

    vaultA: addr.vaultA,
    vaultB: addr.vaultB,
    lpMint: addr.lpMint,

    // these reserves feed directly into CurveCalculator
    baseReserve: baseReserve,
    quoteReserve: quoteReserve,

    configInfo: {
      tradeFeeRate: cfg.tradeFeeRate,
      protocolFeeRate: cfg.protocolFeeRate,
      fundFeeRate: cfg.fundFeeRate,
    },
  };
}

export async function createCpmmPoolTx(
  baseMintAddress: string,
  quoteMintAddress: string,
  baseAmount: number,
  quoteAmount: number,
  wallet: any // Pass the connected wallet
) {
  const raydium = await initSdk({
    loadToken: true,
    wallet, // Pass the wallet to the SDK
  });

  console.log({
    baseMintAddress,
    quoteMintAddress,
  });

  // Get token info for both mints
  let baseMint;
  try {
    baseMint = await raydium.token.getTokenInfo(baseMintAddress);
    console.log("Base mint info:", baseMint);
  } catch (error) {
    console.error("Error getting base token info:", error);
    // Fallback to manual token info if API call fails
    baseMint = {
      address: baseMintAddress,
      programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      decimals: 6,
    };
    console.log("Using fallback base mint info:", baseMint);
  }

  const quoteMint = await raydium.token.getTokenInfo(quoteMintAddress);
  console.log("Quote mint info:", quoteMint);

  // Check if the token accounts exist and create them if needed
  // This step is crucial to avoid the "you don't has some token account" error
  const connection = raydium.connection;
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) }
  );

  console.log("Token accounts:", tokenAccounts.value.length);
  console.log(
    "token accounts:",
    tokenAccounts,
    "baseMintAddress",
    baseMintAddress
  );

  // Check if we have the base token account
  const hasBaseTokenAccount = tokenAccounts.value.some(
    (account) => account.account.data.parsed.info.mint === baseMintAddress
  );

  // Create base token account if it doesn't exist
  if (!hasBaseTokenAccount) {
    // derive the ATA address for this wallet + mint using Token2022
    const baseAta = await getAssociatedTokenAddress(
      new PublicKey(baseMintAddress), // the mint
      wallet.publicKey, // the owner
      false, // allowOwnerOffCurve?
      TOKEN_2022_PROGRAM_ID, // ← our Token2022 program
      ASSOCIATED_TOKEN_PROGRAM_ID // ← the ATA program (unchanged)
    );

    // build the “create ATA” instruction
    const createAtaIx = createAssociatedTokenAccountInstruction(
      wallet.publicKey, // payer
      baseAta, // ATA address we just derived
      wallet.publicKey, // account owner
      new PublicKey(baseMintAddress), // the mint
      TOKEN_2022_PROGRAM_ID, // ← Token2022 program
      ASSOCIATED_TOKEN_PROGRAM_ID // ← ATA program
    );

    const tx = new Transaction().add(createAtaIx);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await wallet.signTransaction(tx);
    const txid = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txid);
    console.log("created ATA:", baseAta.toBase58(), txid);
  }

  // Get the fee configs
  const feeConfigs = await raydium.api.getCpmmConfigs();
  if (raydium.cluster === "devnet") {
    feeConfigs.forEach((config) => {
      config.id = getCpmmPdaAmmConfigId(
        DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        config.index
      ).publicKey.toBase58();
    });
  }

  console.log({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA: baseMint,
    mintB: quoteMint,
    mintAAmount: new BN(baseAmount * 10 ** baseMint.decimals).toString(),
    mintBAmount: new BN(quoteAmount * 10 ** quoteMint.decimals).toString(),
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: { useSOLBalance: true },
    txVersion,
  });

  try {
    const result = await raydium.cpmm.createPool({
      programId: CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
      mintA: baseMint,
      mintB: quoteMint,
      mintAAmount: new BN(baseAmount * 10 ** baseMint.decimals),
      mintBAmount: new BN(quoteAmount * 10 ** quoteMint.decimals),
      startTime: new BN(0),
      feeConfig: feeConfigs[0],
      associatedOnly: false,
      ownerInfo: { useSOLBalance: true },
      txVersion,
    });

    const mintAAmount = new BN(baseAmount * 10 ** baseMint.decimals);
    const mintBAmount = new BN(quoteAmount * 10 ** quoteMint.decimals);

    const { transaction, execute, extInfo } = result;

    // 2. synthesize your poolInfo + poolKeys
    const poolInfo = buildCpmmPoolInfo(result, mintAAmount, mintBAmount);
    const poolKeys = buildCpmmPoolKeys(result);

    console.log("poolInfo", poolInfo);
    console.log("poolKeys", poolKeys);

    return {
      transaction,
      poolInfo,
      poolKeys,
      execute,
    };
  } catch (error) {
    console.error("Error creating pool:", error);
    throw new Error(`Failed to create pool: ${error.message}`);
  }
}
