"use client";

import React, { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle, Info } from "lucide-react";
import { createCpmmPoolTx } from "@/lib/createPoolTx";
import { createSnipeTx } from "@/lib/createSnipeTx";
import { submitCpmmLaunchBundle } from "@/lib/submitCpmmBundle";
import BundleMonitor from "@/components/bundle-monitor";
import NetworkSelector from "@/components/network-selector";
import WalletContextProvider from "@/components/wallet-provider";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  hasTokenAccount,
  getTokenBalance,
  transferTokens,
} from "@/lib/token-transfer";
import { createAddLiquidityTx } from "@/lib/addLiquidityTx";

interface TransactionInfo {
  signature: string;
  status: "pending" | "confirmed" | "failed";
  type: "pool" | "buy";
  walletIndex?: number;
}

export default function TokenLaunch() {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(
    WalletAdapterNetwork.Devnet
  );

  const updateNetwork = (newNetwork: WalletAdapterNetwork) => {
    console.log("Updating network to:", newNetwork);
    setNetwork(newNetwork);
  };

  return (
    <WalletContextProvider defaultNetwork={network}>
      <TokenLaunchContent network={network} setNetwork={updateNetwork} />
    </WalletContextProvider>
  );
}

interface TokenLaunchContentProps {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
}

function TokenLaunchContent({ network, setNetwork }: TokenLaunchContentProps) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  // Form fields
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [amm, setAmm] = useState("raydium");

  // Sniper wallets
  const [numWallets, setNumWallets] = useState(5);
  const [totalSniperSol, setTotalSniperSol] = useState("");
  const [walletDistribution, setWalletDistribution] = useState<number[]>([
    20, 20, 20, 20, 20,
  ]);

  // Transaction settings
  const [useMev, setUseMev] = useState(true);
  const [jitoTipLamports, setJitoTipLamports] = useState("10000000");

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [snipeDelay, setSnipeDelay] = useState(0);
  const [sniperWalletKeys, setSniperWalletKeys] = useState("");
  const [slippage, setSlippage] = useState(0.5);

  // Status tracking
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bundleId, setBundleId] = useState<string | undefined>();
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);

  // Update number of wallets
  const handleNumWalletsChange = (value: number) => {
    const newNum = Math.min(Math.max(1, value), 10);
    setNumWallets(newNum);

    const newDistribution = Array(newNum).fill(0);
    const equalShare = 100 / newNum;

    for (let i = 0; i < newNum; i++) {
      newDistribution[i] = Math.round(equalShare * 10) / 10;
    }

    const total = newDistribution.reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      newDistribution[0] += 100 - total;
    }

    setWalletDistribution(newDistribution);
  };

  // Helper function to update wallet distribution
  const updateWalletDistribution = (idx: number, value: number) => {
    const newDistribution = [...walletDistribution];

    const diff = value - newDistribution[idx];
    const currentTotal = newDistribution.reduce((sum, val) => sum + val, 0);

    if (currentTotal + diff > 100) {
      return;
    }

    newDistribution[idx] = value;

    if (diff !== 0) {
      const remainingPercentage =
        100 - newDistribution.reduce((sum, val) => sum + val, 0);
      const othersCount = Math.min(numWallets, newDistribution.length) - 1;

      if (othersCount > 0) {
        const addPerWallet = remainingPercentage / othersCount;

        for (let i = 0; i < Math.min(numWallets, newDistribution.length); i++) {
          if (i !== idx) {
            newDistribution[i] = Math.max(0, newDistribution[i] + addPerWallet);
          }
        }
      }
    }

    for (let i = 0; i < newDistribution.length; i++) {
      newDistribution[i] = Math.round(newDistribution[i] * 10) / 10;
    }

    const newTotal = newDistribution
      .slice(0, numWallets)
      .reduce((sum, val) => sum + val, 0);
    if (newTotal !== 100 && newTotal < 100.1) {
      newDistribution[0] += 100 - newTotal;
    }

    setWalletDistribution(newDistribution);
  };

  // Function to monitor bundle status
  const monitorBundleStatus = async (bundleId: string) => {
    try {
      // In a real implementation, you would use Jito's API to query bundle status
      // For now, we'll simulate status updates

      // Simulate pool transaction confirmation after 5 seconds
      setTimeout(() => {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.type === "pool" ? { ...tx, status: "confirmed" } : tx
          )
        );
        setTxStatus(
          "Pool transaction confirmed! Waiting for buy transactions..."
        );
      }, 5000);

      // Simulate buy transactions confirming one by one
      let delay = 7000;
      for (let i = 0; i < numWallets; i++) {
        setTimeout(() => {
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.type === "buy" && tx.walletIndex === i + 1
                ? { ...tx, status: "confirmed" }
                : tx
            )
          );
          setTxStatus(`Buy transaction ${i + 1} confirmed!`);

          if (i === numWallets - 1) {
            setTxStatus(
              `All transactions confirmed! Your token is now launched with self-snipe protection.`
            );
            setSuccess(
              "Token successfully launched with self-snipe protection!"
            );
          }
        }, delay);
        delay += 2000;
      }
    } catch (error) {
      console.error("Error monitoring bundle:", error);
      setError(
        `Failed to monitor bundle: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Main submit handler
  // Updated handleSubmit function for token-launch.tsx
  // Updated handleSubmit function with token account checks
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey || !signTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setError("");
    setSuccess("");
    setTxStatus("");
    setIsLoading(true);
    setTransactions([]);
    setBundleId(undefined);

    try {
      // Parse token address
      const tokenPublicKey = new PublicKey(tokenAddress);

      // Parse amounts
      const tokenAmountValue = parseFloat(tokenAmount);
      const solAmountValue = parseFloat(solAmount);
      const totalSniperSolValue = parseFloat(totalSniperSol);

      if (
        isNaN(tokenAmountValue) ||
        isNaN(solAmountValue) ||
        isNaN(totalSniperSolValue)
      ) {
        throw new Error("Invalid amount values");
      }

      // Parse or generate sniper wallets
      let sniperWallets: Keypair[] = [];
      if (sniperWalletKeys.trim()) {
        // Parse user-provided private keys
        const keys = sniperWalletKeys.split("\n").filter((key) => key.trim());
        sniperWallets = keys.map((key) => {
          try {
            return Keypair.fromSecretKey(
              Uint8Array.from(JSON.parse(key.trim()))
            );
          } catch (e: any) {
            throw new Error(`Invalid wallet key format: ${e.message}`);
          }
        });
      } else {
        // Generate wallets if none provided
        sniperWallets = Array(numWallets)
          .fill(0)
          .map(() => Keypair.generate());

        // Show generated wallet keys to user
        const generatedKeysString = sniperWallets
          .map((kp) => JSON.stringify(Array.from(kp.secretKey)))
          .join("\n");
        setSniperWalletKeys(generatedKeysString);
      }

      // Create wallet adapter for the connected wallet
      const connectedWalletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions: async (txs: any[]) => {
          return Promise.all(txs.map((tx) => signTransaction(tx)));
        },
      };

      // Check if our wallet has a token account for the base token
      setTxStatus("Checking token accounts...");
      console.log("Checking token accounts...");
      const hasBaseToken = await hasTokenAccount(
        connection,
        publicKey,
        tokenAddress
      );

      // If we don't have the token account, create it
      if (!hasBaseToken) {
        setTxStatus("Creating token account for your wallet...");
        console.log("Creating token account for your wallet...");
        try {
          // Create the associated token account
          const mint = new PublicKey(tokenAddress);
          const associatedTokenAddress = await getAssociatedTokenAddress(
            mint,
            publicKey
          );

          console.log(
            "Associated token address:",
            associatedTokenAddress.toString()
          );
          console.log("Mint address:", mint.toString());

          const createAtaIx = createAssociatedTokenAccountInstruction(
            publicKey,
            associatedTokenAddress,
            publicKey,
            mint,
            TOKEN_2022_PROGRAM_ID
          );

          const createAtaTx = new Transaction().add(createAtaIx);
          const { blockhash } = await connection.getLatestBlockhash();
          createAtaTx.recentBlockhash = blockhash;
          createAtaTx.feePayer = publicKey;

          const signedTx = await signTransaction(createAtaTx);
          const txId = await connection.sendRawTransaction(
            signedTx.serialize()
          );
          await connection.confirmTransaction(txId);

          setTxStatus("Token account created successfully");
        } catch (err) {
          console.error("Error creating token account:", err);
          setTxStatus("Continuing anyway - the pool creation may handle this");
        }
      }

      // Check token balance
      setTxStatus("Checking token balance...");
      const balance = await getTokenBalance(
        connection,
        publicKey,
        tokenAddress
      );
      console.log(`Current token balance: ${balance}`);

      if (balance === null || balance < parseFloat(tokenAmount)) {
        setError(
          `Insufficient token balance. You need at least ${tokenAmount} tokens, but you have ${
            balance || 0
          }.`
        );
        setIsLoading(false);
        return;
      }

      setTxStatus("Creating liquidity pool transaction...");
      console.log("Creating liquidity pool transaction...");

      // Step 1: Create liquidity pool transaction
      const {
        transaction: poolTx,
        poolKeys,
        poolInfo,
      } = await createCpmmPoolTx(
        tokenAddress, // baseMintAddress - the token being created
        "So11111111111111111111111111111111111111112", // quoteMintAddress - SOL wrapped address
        parseFloat(tokenAmount), // baseAmount - amount of tokens for liquidity
        parseFloat(solAmount), // quoteAmount - amount of SOL for liquidity
        connectedWalletAdapter // Pass the connected wallet
      );

      console.log("Liquidity pool transaction created:", poolTx);
      // console.log("Pool info:", poolInfo);

      // setTxStatus("Creating add liquidity transaction...");

      // // Step 2: Create add liquidity transaction
      // const addLiquidityTx = await createAddLiquidityTx(
      //   poolInfo,
      //   parseFloat(tokenAmount),
      //   parseFloat(solAmount),
      //   connectedWalletAdapter
      // );

      setTxStatus("Creating buy transactions...");

      // Step 3: Create buy transactions for each sniper wallet
      const buyTxPromises = sniperWallets.map(async (walletKeypair, i) => {
        const solToUse = (totalSniperSolValue * walletDistribution[i]) / 100;
        const minTokenOut =
          tokenAmountValue * (solToUse / solAmountValue) * (1 - slippage / 100);
        return createSnipeTx(
          poolInfo,
          poolKeys,
          "So11111111111111111111111111111111111111112", // SOL wrapped address
          solToUse,
          minTokenOut,
          walletKeypair // Pass the sniper wallet
        );
      });

      const snipeTxs = await Promise.all(buyTxPromises);

      console.log({
        useMev,
        connection,
        poolTx,
        addLiquidityTx,
        snipeTxs,
      });

      // If using Jito MEV protection
      if (useMev) {
        setTxStatus("Sending bundle to Jito...");

        try {
          // Use our helper function to submit the bundle
          const bundleResult = await submitCpmmLaunchBundle(
            poolTx,
            addLiquidityTx,
            snipeTxs,
            publicKey, // tip account
            parseInt(jitoTipLamports)
          );

          setBundleId(bundleResult.uuid || bundleResult.bundle_id);
          const bundleIdToUse = bundleResult.uuid || bundleResult.bundle_id;

          setTxStatus(
            `Bundle submitted with ID: ${bundleIdToUse}. Monitoring transaction confirmation...`
          );

          // Create placeholder transactions for monitoring
          const poolPlaceholder = {
            signature: bundleIdToUse + "-pool",
            status: "pending" as "pending" | "confirmed" | "failed",
            type: "pool" as "pool" | "buy",
          };

          const liquidityPlaceholder = {
            signature: bundleIdToUse + "-liquidity",
            status: "pending" as "pending" | "confirmed" | "failed",
            type: "liquidity" as any,
          };

          const buyPlaceholders = snipeTxs.map((_, i) => ({
            signature: bundleIdToUse + `-buy-${i}`,
            status: "pending" as "pending" | "confirmed" | "failed",
            type: "buy" as "pool" | "buy",
            walletIndex: i + 1,
          }));

          setTransactions([
            poolPlaceholder,
            liquidityPlaceholder,
            ...buyPlaceholders,
          ]);

          // Start monitoring bundle status
          monitorBundleStatus(bundleIdToUse);
        } catch (err: any) {
          console.error("Error sending bundle:", err);
          setError(`Failed to send bundle: ${err.message || "Unknown error"}`);
        }
      } else {
        // Standard transaction sending
        setTxStatus("Sending pool creation transaction...");

        try {
          if (!signTransaction) {
            throw new Error("Wallet doesn't support transaction signing");
          }

          // Sign and send pool transaction
          const signedPoolTx = await signTransaction(poolTx);
          const poolSig = await connection.sendRawTransaction(
            signedPoolTx.serialize()
          );

          // Add to transactions for monitoring
          setTransactions([
            {
              signature: poolSig,
              status: "pending",
              type: "pool",
            },
          ]);

          setTxStatus(`Pool creation transaction sent! Signature: ${poolSig}`);

          // Wait for confirmation
          await connection.confirmTransaction(poolSig);

          // Update status
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.type === "pool" ? { ...tx, status: "confirmed" } : tx
            )
          );

          // Send add liquidity transaction
          setTxStatus(`Pool created! Sending add liquidity transaction...`);

          const signedLiquidityTx = await signTransaction(addLiquidityTx);
          const liquiditySig = await connection.sendRawTransaction(
            signedLiquidityTx.serialize()
          );

          // Add to transactions for monitoring
          setTransactions((prev) => [
            ...prev,
            {
              signature: liquiditySig,
              status: "pending",
              type: "liquidity" as any,
            },
          ]);

          // Wait for liquidity confirmation
          await connection.confirmTransaction(liquiditySig);

          // Update status
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.signature === liquiditySig
                ? { ...tx, status: "confirmed" }
                : tx
            )
          );

          setTxStatus(`Liquidity added! Waiting to send buy transactions...`);

          // Add delay if requested
          if (snipeDelay > 0) {
            setTxStatus(`Waiting ${snipeDelay} blocks before sniping...`);
            await new Promise((resolve) =>
              setTimeout(resolve, snipeDelay * 400)
            ); // Approx 400ms per block
          }

          // Send buy transactions
          setTxStatus("Sending buy transactions...");

          const buySigs = await Promise.all(
            snipeTxs.map(async (tx, i) => {
              const signature = await connection.sendRawTransaction(
                tx.serialize()
              );

              // Add to transactions for monitoring
              setTransactions((prev) => [
                ...prev,
                {
                  signature,
                  status: "pending",
                  type: "buy",
                  walletIndex: i + 1,
                },
              ]);

              return signature;
            })
          );

          setTxStatus(
            `All buy transactions sent! Waiting for confirmations...`
          );

          // Wait for all confirmations
          await Promise.all(
            buySigs.map(async (sig, index) => {
              try {
                await connection.confirmTransaction(sig);
                // Update status
                setTransactions((prev) =>
                  prev.map((tx) =>
                    tx.signature === sig ? { ...tx, status: "confirmed" } : tx
                  )
                );
              } catch (err) {
                console.error(`Error confirming transaction ${index}:`, err);
                // Mark as failed
                setTransactions((prev) =>
                  prev.map((tx) =>
                    tx.signature === sig ? { ...tx, status: "failed" } : tx
                  )
                );
              }
            })
          );

          setTxStatus(
            `All transactions processed! Your token is now launched with self-snipe protection.`
          );
          setSuccess("Token successfully launched with self-snipe protection!");
        } catch (err: any) {
          console.error("Transaction error:", err);
          setError(`Transaction failed: ${err.message || "Unknown error"}`);
        }
      }
    } catch (err: any) {
      console.error("Launch error:", err);
      setError(`Error: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when form values change
  useEffect(() => {
    if (error) setError("");
  }, [
    tokenAddress,
    tokenAmount,
    solAmount,
    totalSniperSol,
    numWallets,
    useMev,
  ]);

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to use the token launcher with bot
                protection
              </CardDescription>
            </div>
            <NetworkSelector network={network} setNetwork={setNetwork} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="mb-6 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You need to connect your Solana wallet to continue
            </p>
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md max-w-md">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Network:</strong>{" "}
              {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              {network === WalletAdapterNetwork.Devnet
                ? "You're on Devnet. Changes here won't affect Mainnet tokens."
                : "You're on Mainnet. Real SOL will be used for transactions."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Token Launch & Snipe Protection</CardTitle>
            <CardDescription>
              Create a liquidity pool and snipe your own token in the same
              transaction to prevent price manipulation by MEV bots
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <NetworkSelector network={network} setNetwork={setNetwork} />
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Network:{" "}
            {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 text-green-700 mb-4">
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <Label htmlFor="tokenAddress">Token Address</Label>
              <Input
                id="tokenAddress"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="Enter your Token 2022 address"
                required
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Your SPL Token 2022 mint address
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="tokenAmount">Token Amount for Liquidity</Label>
                <Input
                  id="tokenAmount"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Amount of tokens to add"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Tokens you'll provide to the pool
                </p>
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="solAmount">SOL Amount for Liquidity</Label>
                <Input
                  id="solAmount"
                  type="number"
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                  placeholder="Amount of SOL to add"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  SOL you'll provide to the pool
                </p>
              </div>
            </div>

            <div className="grid w-full gap-1.5">
              <Label>Select AMM</Label>
              <div className="flex gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="raydium"
                    value="raydium"
                    checked={amm === "raydium"}
                    onChange={() => setAmm("raydium")}
                    className="mr-2"
                  />
                  <Label htmlFor="raydium">Raydium</Label>
                </div>

                <div className="flex items-center opacity-50">
                  <input
                    type="radio"
                    id="orca"
                    value="orca"
                    checked={amm === "orca"}
                    onChange={() => setAmm("orca")}
                    className="mr-2"
                    disabled
                  />
                  <Label htmlFor="orca">Orca (Coming Soon)</Label>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Sniper Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="numWallets">Number of Sniper Wallets</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="numWallets"
                      type="number"
                      min="1"
                      max="10"
                      value={numWallets}
                      onChange={(e) =>
                        handleNumWalletsChange(parseInt(e.target.value))
                      }
                      className="w-24"
                    />
                    <span>{numWallets} wallets</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Number of wallets that will snipe your token
                  </p>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="totalSniperSol">Total SOL for Sniping</Label>
                  <Input
                    id="totalSniperSol"
                    type="number"
                    value={totalSniperSol}
                    onChange={(e) => setTotalSniperSol(e.target.value)}
                    placeholder="Total SOL to use for sniping"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Total SOL distributed across sniper wallets
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <Label>Wallet SOL Distribution (%)</Label>
                <div className="space-y-3 mt-2">
                  {walletDistribution.map(
                    (percentage, idx) =>
                      idx < numWallets && (
                        <div
                          key={idx}
                          className="grid grid-cols-8 gap-2 items-center"
                        >
                          <span className="col-span-1">Wallet {idx + 1}</span>
                          <Slider
                            className="col-span-5"
                            value={[percentage]}
                            max={100}
                            step={1}
                            onValueChange={(value) =>
                              updateWalletDistribution(idx, value[0])
                            }
                          />
                          <span className="col-span-2 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      )
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  How much SOL each wallet will use for sniping
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="useMev"
                checked={useMev}
                onCheckedChange={setUseMev}
              />
              <Label htmlFor="useMev">Use Jito MEV Protection</Label>
              <div className="flex-1"></div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
              </Button>
            </div>

            {useMev && (
              <div className="grid w-full gap-1.5">
                <Label htmlFor="jitoTip">Jito Tip (lamports)</Label>
                <Input
                  id="jitoTip"
                  value={jitoTipLamports}
                  onChange={(e) => setJitoTipLamports(e.target.value)}
                  placeholder="Tip for Jito searchers (in lamports)"
                />
                <p className="text-sm text-muted-foreground">
                  {(parseInt(jitoTipLamports) / LAMPORTS_PER_SOL).toFixed(4)}{" "}
                  SOL - Tip for Jito validators to include your bundle
                </p>
              </div>
            )}

            {showAdvanced && (
              <div className="border-t pt-4 space-y-4">
                <h3 className="text-lg font-medium">Advanced Settings</h3>

                {!useMev && (
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="snipeDelay">
                      Block Delay Before Sniping
                    </Label>
                    <Input
                      id="snipeDelay"
                      type="number"
                      min="0"
                      value={snipeDelay}
                      onChange={(e) => setSnipeDelay(parseInt(e.target.value))}
                      placeholder="Number of blocks to wait (0 = same block)"
                    />
                    <p className="text-sm text-muted-foreground">
                      Number of blocks to wait after pool creation before
                      sniping (0 for immediate)
                    </p>
                  </div>
                )}

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="slippage">Slippage Tolerance (%)</Label>
                  <Input
                    id="slippage"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={slippage}
                    onChange={(e) => setSlippage(parseFloat(e.target.value))}
                    placeholder="Slippage tolerance percentage"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum price impact you're willing to accept for trades
                  </p>
                </div>

                <div className="grid w-full gap-1.5">
                  <Label htmlFor="sniperWallets">
                    Custom Sniper Wallet Keys (optional)
                  </Label>
                  <Textarea
                    id="sniperWallets"
                    value={sniperWalletKeys}
                    onChange={(e) => setSniperWalletKeys(e.target.value)}
                    placeholder="Paste your wallet private keys (one per line, as JSON arrays)"
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty to auto-generate wallets. If provided, must
                    match the number of wallets selected.
                  </p>
                </div>
              </div>
            )}
          </div>

          {txStatus && (
            <Alert className="border-blue-500">
              <Info className="h-4 w-4" />
              <AlertDescription>{txStatus}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Launch Token"
            )}
          </Button>
        </form>
      </CardContent>

      <div className="p-4 border rounded-md mb-4 bg-slate-50 dark:bg-slate-900">
        <h3 className="text-md font-medium mb-2">Transaction Process</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li
            className={
              isLoading && txStatus.includes("pool")
                ? "text-blue-600 font-medium"
                : ""
            }
          >
            Create liquidity pool
          </li>
          <li
            className={
              isLoading && txStatus.includes("liquidity")
                ? "text-blue-600 font-medium"
                : ""
            }
          >
            Add initial liquidity
          </li>
          <li
            className={
              isLoading && txStatus.includes("buy")
                ? "text-blue-600 font-medium"
                : ""
            }
          >
            Execute self-snipe transactions ({numWallets} wallets)
          </li>
          <li
            className={
              isLoading && txStatus.includes("bundle")
                ? "text-blue-600 font-medium"
                : ""
            }
          >
            Bundle and submit all transactions
          </li>
        </ol>
      </div>

      <CardFooter className="flex flex-col">
        <p className="text-sm text-muted-foreground mb-4">
          This will create a liquidity pool and protect it with self-sniping to
          prevent MEV bots from sandwich attacking your launch
        </p>

        {(isLoading || transactions.length > 0) && (
          <BundleMonitor
            bundleId={bundleId}
            transactions={transactions}
            isProcessing={isLoading}
          />
        )}
      </CardFooter>
    </Card>
  );
}
