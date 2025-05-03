"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Upload, FileText, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TokenDistributionProps {
  tokenData: {
    recipients: Array<{ wallet: string; amount: string }>;
    [key: string]: any;
  };
  updateTokenData: (
    data: Partial<{ recipients: Array<{ wallet: string; amount: string }> }>
  ) => void;
}

export default function TokenDistribution({
  tokenData,
  updateTokenData,
}: TokenDistributionProps) {
  const [error, setError] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvText, setCsvText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addRecipient = () => {
    const newRecipients = [...tokenData.recipients, { wallet: "", amount: "" }];
    updateTokenData({ recipients: newRecipients });
  };

  const updateRecipient = (
    index: number,
    field: "wallet" | "amount",
    value: string
  ) => {
    const newRecipients = [...tokenData.recipients];

    if (field === "amount" && value !== "") {
      if (!/^\d+$/.test(value)) {
        return;
      }
    }

    newRecipients[index][field] = value;
    updateTokenData({ recipients: newRecipients });
    setError("");
  };

  const removeRecipient = (index: number) => {
    const newRecipients = tokenData.recipients.filter((_, i) => i !== index);
    updateTokenData({ recipients: newRecipients });
  };

  const validateWalletAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(address);
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

      updateTokenData({ recipients: newRecipients });
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Token Distribution</h2>
        <p className="text-sm text-slate-500">
          Add wallet addresses to distribute your tokens to. Leave empty if you
          don't want to distribute tokens yet.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="manual">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {tokenData.recipients.length === 0 ? (
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
                    {tokenData.recipients.map((recipient, index) => (
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
                              updateRecipient(index, "wallet", e.target.value)
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
                          <Label htmlFor={`amount-${index}`}>Amount</Label>
                          <Input
                            id={`amount-${index}`}
                            placeholder="Token amount"
                            value={recipient.amount}
                            onChange={(e) =>
                              updateRecipient(index, "amount", e.target.value)
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Upload CSV File</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>
                              Upload a CSV file with wallet addresses and token
                              amounts. Format: wallet_address,amount (one per
                              line)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <input
                        type="file"
                        id="csv-file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleCsvFileUpload}
                        ref={fileInputRef}
                      />
                      <label htmlFor="csv-file">
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          asChild
                        >
                          <div>
                            <Upload className="h-4 w-4 mr-2" />
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
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">CSV Format Example</span>
                    </div>
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
                  <h3 className="text-sm font-medium">Current Recipients</h3>
                  {tokenData.recipients.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No recipients added yet
                    </p>
                  ) : (
                    <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                      <p className="text-sm mb-2">
                        <span className="font-medium">
                          {tokenData.recipients.length}
                        </span>{" "}
                        recipients
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {tokenData.recipients
                            .reduce((sum, r) => sum + Number(r.amount), 0)
                            .toLocaleString()}
                        </span>{" "}
                        tokens to be minted
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => updateTokenData({ recipients: [] })}
                      >
                        Clear All Recipients
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-sm text-slate-500">
        <p>
          Note: You can always distribute tokens later by using the mint
          authority of your token.
        </p>
      </div>
    </div>
  );
}
