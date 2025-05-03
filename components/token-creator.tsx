"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, AlertCircle } from "lucide-react";
import TokenDetails from "./token-details";
import TokenMetadata from "./token-metadata";
import TokenDistribution from "./token-distribution";
import TokenReview from "./token-review";
import WalletContextProvider from "./wallet-provider";
import NetworkSelector from "./network-selector";

export default function TokenCreator() {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(
    WalletAdapterNetwork.Devnet
  );

  const updateNetwork = (newNetwork: WalletAdapterNetwork) => {
    console.log("Updating network to:", newNetwork);
    setNetwork(newNetwork);
  };

  return (
    <WalletContextProvider defaultNetwork={network}>
      <TokenCreatorContent network={network} setNetwork={updateNetwork} />
    </WalletContextProvider>
  );
}

interface TokenCreatorContentProps {
  network: WalletAdapterNetwork;
  setNetwork: (network: WalletAdapterNetwork) => void;
}

function TokenCreatorContent({
  network,
  setNetwork,
}: TokenCreatorContentProps) {
  const { publicKey, connected } = useWallet();
  const [currentStep, setCurrentStep] = useState("details");
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    logoUrl: "",
    logoFile: undefined as File | undefined,
    metadata: {},
    metadataUri: "",
    recipients: [] as Array<{ wallet: string; amount: string }>,
    tokenAddress: "",
    isCreating: false,
    isMinting: false,
    error: "",
    success: false,
  });

  useEffect(() => {
    console.log("Current network in TokenCreatorContent:", network);
  }, [network]);

  const updateTokenData = (data: Partial<typeof tokenData>) => {
    setTokenData((prev) => ({ ...prev, ...data }));
  };

  const steps = [
    { id: "details", label: "Details", component: TokenDetails },
    { id: "metadata", label: "Metadata", component: TokenMetadata },
    { id: "distribution", label: "Distribution", component: TokenDistribution },
    { id: "review", label: "Review", component: TokenReview },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const CurrentStepComponent = steps[currentStepIndex].component;

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
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
                Connect your Phantom wallet to create and mint Solana tokens
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
                ? "You're on Devnet. Tokens created here won't appear on Mainnet."
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
            <CardTitle>Create Your Solana Token</CardTitle>
            <CardDescription>
              Connected: {publicKey?.toString().slice(0, 6)}...
              {publicKey?.toString().slice(-4)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <NetworkSelector network={network} setNetwork={setNetwork} />
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Progress
            value={(currentStepIndex + 1) * (100 / steps.length)}
            className="h-2"
          />
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`${
                  index <= currentStepIndex ? "text-purple-600 font-medium" : ""
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Network:{" "}
            {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}
          </p>
        </div>

        {tokenData.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{tokenData.error}</AlertDescription>
          </Alert>
        )}

        {tokenData.success && (
          <Alert className="mb-6 border-green-500 text-green-700">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Token created successfully! Token address:{" "}
              {tokenData.tokenAddress}
            </AlertDescription>
          </Alert>
        )}

        <CurrentStepComponent
          tokenData={tokenData}
          updateTokenData={updateTokenData}
          network={network}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={
            currentStepIndex === 0 ||
            tokenData.isCreating ||
            tokenData.isMinting
          }
        >
          Previous
        </Button>

        {currentStep === "review" ? (
          <Button
            onClick={() => {
              /* Token creation logic will be implemented in TokenReview component */
            }}
            disabled={tokenData.isCreating || tokenData.isMinting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {tokenData.isCreating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {tokenData.isCreating ? "Creating Token..." : "Create Token"}
          </Button>
        ) : (
          <Button
            onClick={goToNextStep}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
