// components/bundle-monitor.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface TransactionInfo {
  signature: string;
  status: "pending" | "confirmed" | "failed";
  type: "pool" | "buy" | "liquidity";
  walletIndex?: number;
}

interface BundleMonitorProps {
  bundleId?: string;
  transactions: TransactionInfo[];
  isProcessing: boolean;
  walletDistribution?: number[];
  totalSniperSol?: string;
}

export default function BundleMonitor({
  bundleId,
  transactions,
  isProcessing,
  walletDistribution = [],
  totalSniperSol = "",
}: BundleMonitorProps) {
  const poolTx = transactions.find((tx) => tx.type === "pool");
  const liquidityTx = transactions.find((tx) => tx.type === "liquidity");
  const buyTxs = transactions.filter((tx) => tx.type === "buy");

  const getStatusIcon = (status: string) => {
    if (status === "pending") {
      return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />;
    } else if (status === "confirmed") {
      return <Check className="h-4 w-4 text-green-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Transaction Monitor</CardTitle>
        {bundleId && (
          <div className="text-xs font-mono mt-1 text-muted-foreground">
            Bundle ID: {bundleId}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isProcessing && !transactions.length ? (
            <div className="flex items-center space-x-2 text-amber-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparing transactions...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center">
                <div className="font-medium">Pool Creation</div>
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {poolTx && (
                    <div
                      className={`h-full rounded-full ${
                        poolTx.status === "confirmed"
                          ? "bg-green-500"
                          : poolTx.status === "failed"
                          ? "bg-red-500"
                          : "bg-amber-400"
                      }`}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {poolTx ? (
                    getStatusIcon(poolTx.status)
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Not started
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 items-center">
                <div className="font-medium">Add Liquidity</div>
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {liquidityTx && (
                    <div
                      className={`h-full rounded-full ${
                        liquidityTx.status === "confirmed"
                          ? "bg-green-500"
                          : liquidityTx.status === "failed"
                          ? "bg-red-500"
                          : "bg-amber-400"
                      }`}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {liquidityTx ? (
                    getStatusIcon(liquidityTx.status)
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Not started
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="font-medium mb-2">
                  Self-Snipe Transactions (
                  {buyTxs.filter((tx) => tx.status === "confirmed").length}/
                  {buyTxs.length})
                </div>

                {buyTxs.length > 0 && (
                  <div className="space-y-3">
                    {walletDistribution &&
                      walletDistribution.length > 0 &&
                      totalSniperSol && (
                        <div className="mt-3 grid grid-cols-[5rem_1fr_5rem_4rem] gap-x-3 text-xs text-muted-foreground mb-1">
                          <div>Wallet</div>
                          <div>Distribution</div>
                          <div className="text-right">Percent</div>
                          <div className="text-right">Amount</div>
                        </div>
                      )}

                    {buyTxs.map((tx, idx) => {
                      const percentage = walletDistribution[idx] || 0;
                      const solAmount = totalSniperSol
                        ? (parseFloat(totalSniperSol) * percentage) / 100
                        : 0;

                      return (
                        <div
                          key={tx.signature}
                          className="grid grid-cols-[5rem_1fr_5rem_4rem] gap-x-3 items-center"
                        >
                          <div className="text-sm">Wallet {tx.walletIndex}</div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                tx.status === "confirmed"
                                  ? "bg-green-500"
                                  : tx.status === "failed"
                                  ? "bg-red-500"
                                  : "bg-amber-400"
                              }`}
                              style={{
                                width: percentage ? `${percentage}%` : "100%",
                              }}
                            />
                          </div>
                          <div className="text-xs text-right">
                            {percentage ? `${percentage.toFixed(1)}%` : ""}
                          </div>
                          <div className="flex items-center justify-end space-x-1">
                            {getStatusIcon(tx.status)}
                            <span className="text-xs">
                              {solAmount ? `${solAmount.toFixed(2)} SOL` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {bundleId && (
                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <div className="font-medium">Bundle Status</div>
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        transactions.every((t) => t.status === "confirmed")
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : transactions.some((t) => t.status === "failed")
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {transactions.every((t) => t.status === "confirmed")
                        ? "Completed"
                        : transactions.some((t) => t.status === "failed")
                        ? "Failed"
                        : "In Progress"}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
