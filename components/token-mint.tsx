"use client";

import type React from "react";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Search,
  Plus,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { mintTokens } from "@/lib/solana-token";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface TokenMintProps {
  network?: WalletAdapterNetwork;
}

export default function TokenMint({
  network = WalletAdapterNetwork.Devnet,
}: TokenMintProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    image?: string;
    verified: boolean;
  } | null>(null);
  const [recipients, setRecipients] = useState<
    Array<{ wallet: string; amount: string }>
  >([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvError, setCsvError] = useState("");

  const verifyToken = async () => {
    if (!tokenAddress) {
      setError("Please enter a token address");
      return;
    }

    try {
      setIsVerifying(true);
      setError("");
      setTokenInfo(null);

      let mintPublicKey: PublicKey;
      try {
        mintPublicKey = new PublicKey(tokenAddress);
      } catch (e) {
        setError("Invalid token address format");
        setIsVerifying(false);
        return;
      }

      const tokenAccountInfo = await connection.getAccountInfo(mintPublicKey);
      if (!tokenAccountInfo) {
        setError("Token not found on the blockchain");
        setIsVerifying(false);
        return;
      }

      setTimeout(() => {
        setTokenInfo({
          name: "Demo Token",
          symbol: "DEMO",
          image: "/placeholder.svg?height=64&width=64",
          verified: true,
        });
        setIsVerifying(false);
      }, 1500);
    } catch (error) {
      console.error("Error verifying token:", error);
      setError(
        error instanceof Error ? error.message : "Failed to verify token"
      );
      setIsVerifying(false);
    }
  };

  const addRecipient = () => {
    setRecipients([...recipients, { wallet: "", amount: "" }]);
  };

  const updateRecipient = (
    index: number,
    field: "wallet" | "amount",
    value: string
  ) => {
    const newRecipients = [...recipients];

    if (field === "amount" && value !== "") {
      if (!/^\d+$/.test(value)) {
        return;
      }
    }

    newRecipients[index][field] = value;
    setRecipients(newRecipients);
    setError("");
  };

  const removeRecipient = (index: number) => {
    const newRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(newRecipients);
  };

  const validateWalletAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address);
  };

  const processCsvData = (csvData: string) => {
    setCsvError("");

    try {
      const lines = csvData.split(/\r?\n/).filter((line) => line.trim() !== "");

      if (lines.length === 0) {
        setCsvError("CSV file is empty");
        return;
      }

      const newRecipients: Array<{ wallet: string; amount: string }> = [];
      const errorLines: number[] = [];

      lines.forEach((line, index) => {
        const parts = line.split(/[,;]/).map((part) => part.trim());

        if (parts.length < 2) {
          errorLines.push(index + 1);
          return;
        }

        const [wallet, amount] = parts;

        if (!validateWalletAddress(wallet)) {
          errorLines.push(index + 1);
          return;
        }

        if (!/^\d+$/.test(amount)) {
          errorLines.push(index + 1);
          return;
        }

        newRecipients.push({ wallet, amount });
      });

      if (errorLines.length > 0) {
        setCsvError(`Invalid data on lines: ${errorLines.join(", ")}`);
        return;
      }

      setRecipients(newRecipients);
      setError("");
    } catch (error) {
      setCsvError("Failed to parse CSV data");
      console.error("CSV parsing error:", error);
    }
  };

  const handleCsvTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
  };

  const processCsvText = () => {
    processCsvData(csvText);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setCsvError("Only CSV files are supported");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      setCsvText(csvContent);
      processCsvData(csvContent);
    };
    reader.onerror = () => {
      setCsvError("Error reading the file");
    };
    reader.readAsText(file);
  };

  const handleMintTokens = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Wallet not connected or doesn't support signing");
      return;
    }

    if (!tokenAddress) {
      setError("Please enter a token address");
      return;
    }

    if (recipients.length === 0) {
      setError("Please add at least one recipient");
      return;
    }

    const invalidRecipients = recipients.filter(
      (r) =>
        !validateWalletAddress(r.wallet) ||
        !r.amount ||
        Number.parseInt(r.amount) <= 0
    );
    if (invalidRecipients.length > 0) {
      setError("Some recipients have invalid wallet addresses or amounts");
      return;
    }

    try {
      setIsMinting(true);
      setError("");
      setSuccess(false);

      await mintTokens(wallet, connection, tokenAddress, recipients);

      setSuccess(true);
      setIsMinting(false);
    } catch (error) {
      console.error("Error minting tokens:", error);
      setError(
        error instanceof Error ? error.message : "Failed to mint tokens"
      );
      setIsMinting(false);
    }
  };

  const getExplorerUrl = (address: string) => {
    const baseUrl = "https://explorer.solana.com/address/";
    return network === WalletAdapterNetwork.Mainnet
      ? `${baseUrl}${address}`
      : `${baseUrl}${address}?cluster=devnet`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Mint Additional Tokens</h2>
        <p className="text-sm text-slate-500">
          Mint more tokens from an existing token that you have authority over
        </p>
        <p className="text-xs text-amber-500 font-medium">
          Network:{" "}
          {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
          {network === WalletAdapterNetwork.Mainnet && (
            <span className="ml-2 font-bold">
              ⚠️ Real SOL will be used for transactions
            </span>
          )}
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
          <AlertDescription>Tokens minted successfully!</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="token-address">Token Address</Label>
              <div className="flex gap-2">
                <Input
                  id="token-address"
                  placeholder="Enter the token's mint address"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={verifyToken}
                  disabled={isVerifying || !tokenAddress || !wallet.connected}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {isVerifying ? "Verifying..." : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Enter the mint address of the token you want to mint more of.
                You must be the mint authority.
              </p>
            </div>

            {tokenInfo && (
              <div className="p-4 border rounded-md bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-3">
                  {tokenInfo.image && (
                    <img
                      src={tokenInfo.image || "/placeholder.svg"}
                      alt="Token logo"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{tokenInfo.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {tokenInfo.symbol}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <a
                      href={getExplorerUrl(tokenAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline text-sm flex items-center"
                    >
                      View on Explorer
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {tokenInfo && (
              <>
                <Separator />

                <Tabs defaultValue="manual">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                    <TabsTrigger value="csv">CSV Import</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual">
                    <div className="space-y-4 mt-4">
                      {recipients.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-slate-500 mb-4">
                            No recipients added yet
                          </p>
                          <Button variant="outline" onClick={addRecipient}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Recipient
                          </Button>
                        </div>
                      ) : (
                        <>
                          {recipients.map((recipient, index) => (
                            <div
                              key={index}
                              className="grid gap-4 md:grid-cols-[2fr,1fr,auto]"
                            >
                              <div className="space-y-2">
                                <Label htmlFor={`wallet-${index}`}>
                                  Wallet Address
                                </Label>
                                <Input
                                  id={`wallet-${index}`}
                                  placeholder="Solana wallet address"
                                  value={recipient.wallet}
                                  onChange={(e) =>
                                    updateRecipient(
                                      index,
                                      "wallet",
                                      e.target.value
                                    )
                                  }
                                  className={
                                    recipient.wallet &&
                                    !validateWalletAddress(recipient.wallet)
                                      ? "border-red-500 focus-visible:ring-red-500"
                                      : ""
                                  }
                                />
                                {recipient.wallet &&
                                  !validateWalletAddress(recipient.wallet) && (
                                    <p className="text-xs text-red-500">
                                      Invalid Solana wallet address
                                    </p>
                                  )}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`amount-${index}`}>
                                  Amount
                                </Label>
                                <Input
                                  id={`amount-${index}`}
                                  placeholder="Token amount"
                                  value={recipient.amount}
                                  onChange={(e) =>
                                    updateRecipient(
                                      index,
                                      "amount",
                                      e.target.value
                                    )
                                  }
                                  type="text"
                                  inputMode="numeric"
                                />
                              </div>
                              <div className="flex items-end">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeRecipient(index)}
                                  className="h-10 w-10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            onClick={addRecipient}
                            className="mt-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Recipient
                          </Button>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="csv">
                    <div className="space-y-6 mt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Upload CSV File</Label>
                          <div>
                            <input
                              type="file"
                              id="csv-file"
                              accept=".csv,text/csv"
                              className="hidden"
                              onChange={handleCsvFileUpload}
                            />
                            <label htmlFor="csv-file">
                              <Button
                                variant="outline"
                                className="cursor-pointer"
                                asChild
                              >
                                <div>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Upload CSV
                                </div>
                              </Button>
                            </label>
                          </div>
                        </div>

                        {csvError && (
                          <Alert variant="destructive">
                            <AlertDescription>{csvError}</AlertDescription>
                          </Alert>
                        )}

                        <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm font-medium mb-2">
                            CSV Format Example
                          </p>
                          <pre className="text-xs overflow-auto p-2 bg-white dark:bg-slate-800 rounded border">
                            {
                              "wallet_address_1,1000\nwallet_address_2,500\nwallet_address_3,750"
                            }
                          </pre>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="csv-text">Or Paste CSV Data</Label>
                        <Textarea
                          id="csv-text"
                          placeholder="wallet_address_1,1000&#10;wallet_address_2,500&#10;wallet_address_3,750"
                          rows={6}
                          value={csvText}
                          onChange={handleCsvTextInput}
                          className="font-mono text-sm"
                        />
                        <Button variant="outline" onClick={processCsvText}>
                          Process CSV Data
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">
                          Current Recipients
                        </h3>
                        {recipients.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            No recipients added yet
                          </p>
                        ) : (
                          <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                            <p className="text-sm mb-2">
                              <span className="font-medium">
                                {recipients.length}
                              </span>{" "}
                              recipients
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">
                                {recipients
                                  .reduce((sum, r) => sum + Number(r.amount), 0)
                                  .toLocaleString()}
                              </span>{" "}
                              tokens to be minted
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => setRecipients([])}
                            >
                              Clear All Recipients
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handleMintTokens}
                  disabled={
                    isMinting ||
                    !tokenAddress ||
                    recipients.length === 0 ||
                    !wallet.connected ||
                    !wallet.signTransaction
                  }
                  className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
                >
                  {isMinting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isMinting ? "Minting Tokens..." : "Mint Tokens"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
