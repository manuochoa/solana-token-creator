"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle, Info } from "lucide-react";
import WalletContextProvider from "./wallet-provider";
import NetworkSelector from "./network-selector";
import {
  changeTransferFee,
  getTokenTransferFeeConfig,
  revokeTransferFeeAuthority,
} from "@/lib/solana-token";

export default function TokenFeeManager() {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(
    WalletAdapterNetwork.Devnet
  );

  const updateNetwork = (newNetwork: WalletAdapterNetwork) => {
    console.log("Updating network to:", newNetwork);
    setNetwork(newNetwork);
  };

  return (
    <WalletContextProvider defaultNetwork={network}>
      <TokenFeeManagerContent network={network} setNetwork={updateNetwork} />
    </WalletContextProvider>
  );
}

interface TokenFeeManagerContentProps {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
}

function TokenFeeManagerContent({
  network,
  setNetwork,
}: TokenFeeManagerContentProps) {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [mintAddress, setMintAddress] = useState("");
  const [newFeeBasisPoints, setNewFeeBasisPoints] = useState("");
  const [newMaxFee, setNewMaxFee] = useState("");
  const [currentFeeConfig, setCurrentFeeConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCurrentFeeConfig = async () => {
    if (!mintAddress) {
      setCurrentFeeConfig(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const config = await getTokenTransferFeeConfig(connection, mintAddress);
      setCurrentFeeConfig(config);

      if (config) {
        setNewFeeBasisPoints(config.transferFeeBasisPoints.toString());
        setNewMaxFee((config.maximumFee / BigInt(10 ** 6)).toString());
      }
    } catch (err) {
      console.error("Error loading fee config:", err);
      setError(
        "Failed to load transfer fee configuration. Please check the mint address."
      );
      setCurrentFeeConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mintAddress && mintAddress.length >= 32) {
      loadCurrentFeeConfig();
    }
  }, [mintAddress, connection]);

  const handleUpdateFee = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setError("Please connect your wallet");
      return;
    }

    if (!mintAddress || !newFeeBasisPoints || !newMaxFee) {
      setError("Please fill in all fields");
      return;
    }

    const feeBasisPoints = parseInt(newFeeBasisPoints);
    if (feeBasisPoints < 0 || feeBasisPoints > 10000) {
      setError("Fee basis points must be between 0 and 10000 (0% to 100%)");
      return;
    }

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      const maxFeeInTokens = parseFloat(newMaxFee);
      const maxFeeWithDecimals = BigInt(maxFeeInTokens * 10 ** 6);

      const signature = await changeTransferFee(
        { publicKey, signTransaction },
        connection,
        mintAddress,
        feeBasisPoints,
        maxFeeWithDecimals
      );

      setSuccess(
        `Transfer fee updated successfully! Transaction: ${signature}`
      );

      // Reload the current config
      await loadCurrentFeeConfig();
    } catch (err) {
      console.error("Error updating transfer fee:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update transfer fee"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokeAuthority = async () => {
    if (!connected || !publicKey || !signTransaction) {
      setError("Please connect your wallet");
      return;
    }

    if (!mintAddress) {
      setError("Please enter a mint address");
      return;
    }

    setIsRevoking(true);
    setError("");
    setSuccess("");

    try {
      const signature = await revokeTransferFeeAuthority(
        { publicKey, signTransaction },
        connection,
        mintAddress
      );

      setSuccess(
        `Transfer fee authority revoked successfully! Transaction: ${signature}`
      );

      // Reload the current config
      await loadCurrentFeeConfig();
    } catch (err) {
      console.error("Error revoking transfer fee authority:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to revoke transfer fee authority"
      );
    } finally {
      setIsRevoking(false);
    }
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>
                Connect your wallet to manage token transfer fees
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
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Manage Transfer Fees</CardTitle>
            <CardDescription>
              Update or revoke transfer fee settings for your token
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <NetworkSelector network={network} setNetwork={setNetwork} />
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Network:{" "}
            {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 text-green-700">
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="mintAddress">Token Mint Address</Label>
            <Input
              id="mintAddress"
              placeholder="Enter token mint address..."
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading current fee configuration...</span>
            </div>
          )}

          {currentFeeConfig && (
            <Alert className="border-blue-500">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Current Transfer Fee:</strong>{" "}
                    {currentFeeConfig.transferFeeBasisPoints / 100}% (
                    {currentFeeConfig.transferFeeBasisPoints} basis points)
                  </p>
                  <p>
                    <strong>Maximum Fee:</strong>{" "}
                    {(currentFeeConfig.maximumFee / BigInt(10 ** 6)).toString()}{" "}
                    tokens
                  </p>
                  <p>
                    <strong>Can Change Fee:</strong>{" "}
                    {currentFeeConfig.transferFeeConfigAuthority
                      ? "Yes"
                      : "No (Authority Revoked)"}
                  </p>
                  {currentFeeConfig.transferFeeConfigAuthority && (
                    <p>
                      <strong>Fee Authority:</strong>{" "}
                      {currentFeeConfig.transferFeeConfigAuthority.toString()}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {currentFeeConfig && currentFeeConfig.transferFeeConfigAuthority && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="feeBasisPoints">
                    Transfer Fee (Basis Points)
                    <span className="text-sm text-slate-500 ml-2">
                      1 basis point = 0.01%, max 10000 (100%)
                    </span>
                  </Label>
                  <Input
                    id="feeBasisPoints"
                    type="number"
                    min="0"
                    max="10000"
                    placeholder="50 (0.5%)"
                    value={newFeeBasisPoints}
                    onChange={(e) => setNewFeeBasisPoints(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="maxFee">
                    Maximum Fee (in tokens)
                    <span className="text-sm text-slate-500 ml-2">
                      Maximum fee that can be charged regardless of transfer
                      amount
                    </span>
                  </Label>
                  <Input
                    id="maxFee"
                    type="number"
                    min="0"
                    placeholder="1000000"
                    value={newMaxFee}
                    onChange={(e) => setNewMaxFee(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleUpdateFee}
                    disabled={isUpdating || isRevoking}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isUpdating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isUpdating ? "Updating..." : "Update Transfer Fee"}
                  </Button>

                  <Button
                    onClick={handleRevokeAuthority}
                    disabled={isUpdating || isRevoking}
                    variant="destructive"
                  >
                    {isRevoking && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isRevoking ? "Revoking..." : "Revoke Fee Authority"}
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Revoking the transfer fee
                    authority will permanently prevent any future changes to the
                    transfer fee. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          {currentFeeConfig && !currentFeeConfig.transferFeeConfigAuthority && (
            <Alert className="border-gray-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The transfer fee authority for this token has been revoked.
                Transfer fees cannot be changed.
              </AlertDescription>
            </Alert>
          )}

          {mintAddress &&
            mintAddress.length >= 32 &&
            !currentFeeConfig &&
            !isLoading && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No transfer fee configuration found for this token. This token
                  might not have transfer fees enabled, or the mint address is
                  invalid.
                </AlertDescription>
              </Alert>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
