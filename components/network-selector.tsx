"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NetworkSelectorProps {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
}

export default function NetworkSelector({
  network,
  setNetwork,
}: NetworkSelectorProps) {
  const { connected, disconnect } = useWallet();
  const [showWarning, setShowWarning] = useState(false);
  const [pendingNetwork, setPendingNetwork] =
    useState<WalletAdapterNetwork | null>(null);

  useEffect(() => {
    console.log("Current network in NetworkSelector:", network);
  }, [network]);

  const handleNetworkChange = (newNetwork: WalletAdapterNetwork) => {
    console.log("Attempting to change network to:", newNetwork);

    if (connected && newNetwork !== network) {
      setShowWarning(true);
      setPendingNetwork(newNetwork);
    } else {
      console.log("Directly changing network to:", newNetwork);
      setNetwork(newNetwork);
    }
  };

  const confirmNetworkChange = () => {
    if (pendingNetwork) {
      console.log("Confirming network change to:", pendingNetwork);
      disconnect();
      setNetwork(pendingNetwork);
      setPendingNetwork(null);
      setShowWarning(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => handleNetworkChange(WalletAdapterNetwork.Devnet)}
            className={
              network === WalletAdapterNetwork.Devnet
                ? "bg-purple-50 dark:bg-purple-900/20"
                : ""
            }
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Devnet
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleNetworkChange(WalletAdapterNetwork.Mainnet)}
            className={
              network === WalletAdapterNetwork.Mainnet
                ? "bg-purple-50 dark:bg-purple-900/20"
                : ""
            }
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Mainnet
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showWarning && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <p>
              Changing networks will disconnect your wallet. Do you want to
              continue?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmNetworkChange}
              >
                Disconnect & Switch
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowWarning(false);
                  setPendingNetwork(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
