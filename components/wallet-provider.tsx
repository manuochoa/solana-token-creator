"use client";

import type React from "react";
import { useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletContextProviderProps {
  children: React.ReactNode;
  defaultNetwork?: WalletAdapterNetwork;
}

export default function WalletContextProvider({
  children,
  defaultNetwork = WalletAdapterNetwork.Devnet,
}: WalletContextProviderProps) {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(defaultNetwork);

  useEffect(() => {
    console.log("Default network changed to:", defaultNetwork);
    setNetwork(defaultNetwork);
  }, [defaultNetwork]);

  useEffect(() => {
    console.log("Network in WalletContextProvider:", network);
  }, [network]);

  const endpoint = useMemo(() => {
    console.log("Setting endpoint for network:", network);
    if (network === WalletAdapterNetwork.Mainnet) {
      return "https://proud-soft-emerald.solana-mainnet.quiknode.pro/63e220c97a3db24e0826c67770818749f32d804e/"; // this is a test one and may not work in the future
      // return "https://api.mainnet-beta.solana.com"
    }
    return clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export { WalletAdapterNetwork };
