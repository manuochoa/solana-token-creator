"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Check, AlertCircle, ExternalLink, Info } from "lucide-react";
import {
  createToken,
  mintTokens,
  revokeMintAuthority,
  revokeMetadataUpdateAuthority,
} from "@/lib/solana-token";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  uploadMetadataToArweave,
  uploadImageToArweave,
} from "@/lib/arweave-upload";

interface TokenReviewProps {
  tokenData: {
    name: string;
    symbol: string;
    logoUrl: string;
    logoFile?: File;
    metadata: Record<string, any>;
    metadataUri: string;
    recipients: Array<{ wallet: string; amount: string }>;
    tokenAddress: string;
    isCreating: boolean;
    isMinting: boolean;
    error: string;
    success: boolean;
    [key: string]: any;
  };
  updateTokenData: (data: Partial<TokenReviewProps["tokenData"]>) => void;
  network?: WalletAdapterNetwork;
}

export default function TokenReview({
  tokenData,
  updateTokenData,
  network = WalletAdapterNetwork.Devnet,
}: TokenReviewProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [creationStep, setCreationStep] = useState(0);
  const [uploadingMetadata, setUploadingMetadata] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    image: 0,
    metadata: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateToken = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      updateTokenData({
        error: "Wallet not connected or doesn't support signing",
      });
      return;
    }

    try {
      updateTokenData({
        isCreating: true,
        error: "",
        success: false,
      });

      setCreationStep(1);

      const enhancedMetadata = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description:
          tokenData.metadata.description || `${tokenData.name} token on Solana`,
        ...tokenData.metadata,
      };

      let imageUrl = tokenData.metadata.image || "";

      if (tokenData.logoFile) {
        setUploadingImage(true);
        setCreationStep(2);

        try {
          const imageBuffer = await tokenData.logoFile.arrayBuffer();

          imageUrl = await uploadImageToArweave(
            imageBuffer,
            tokenData.logoFile.type,
            wallet,
            network
          );

          enhancedMetadata.image = imageUrl;

          updateTokenData({
            metadata: {
              ...tokenData.metadata,
              image: imageUrl,
            },
          });

          setUploadProgress({ ...uploadProgress, image: 100 });
        } catch (error) {
          console.error("Error handling image:", error);
          throw new Error(
            "Image upload failed. Please try again or use a different image."
          );
        } finally {
          setUploadingImage(false);
        }
      } else if (tokenData.logoUrl) {
        enhancedMetadata.image = tokenData.logoUrl;
      }

      setUploadingMetadata(true);
      setCreationStep(3);

      let arweaveMetadataUri = "";

      try {
        const metadataUri = await uploadMetadataToArweave(
          enhancedMetadata,
          wallet,
          network
        );
        console.log("Metadata URI:", metadataUri);

        arweaveMetadataUri = metadataUri;

        updateTokenData({
          metadataUri,
          metadata: enhancedMetadata,
        });

        setUploadProgress({ ...uploadProgress, metadata: 100 });
      } catch (error) {
        console.error("Error handling metadata:", error);

        throw new Error(
          "Metadata upload failed. Please try again or use a different metadata."
        );
      } finally {
        setUploadingMetadata(false);
      }

      setCreationStep(4);

      console.log(
        "Creating token with metadata URI:",
        tokenData.metadataUri || arweaveMetadataUri || "None provided"
      );
      const tokenAddress = await createToken(
        wallet,
        connection,
        tokenData.name,
        tokenData.symbol,
        tokenData.metadataUri || arweaveMetadataUri || "",
        enhancedMetadata
      );

      updateTokenData({ tokenAddress });
      setCreationStep(5);

      if (tokenData.recipients.length > 0) {
        updateTokenData({ isMinting: true });
        setCreationStep(6);

        await mintTokens(
          wallet,
          connection,
          tokenAddress,
          tokenData.recipients
        );

        setCreationStep(7);
      } else {
        setCreationStep(7);
      }

      updateTokenData({
        isCreating: false,
        isMinting: false,
        success: true,
      });
    } catch (error) {
      console.error("Error creating token:", error);
      updateTokenData({
        isCreating: false,
        isMinting: false,
        error:
          error instanceof Error ? error.message : "Failed to create token",
      });
    }
  };

  const handleRevokeMintAuthority = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      updateTokenData({
        error: "Wallet not connected or doesn't support signing",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await revokeMintAuthority(wallet, connection, tokenData.tokenAddress);
      updateTokenData({ success: true });
    } catch (error) {
      console.error("Error revoking mint authority:", error);
      updateTokenData({
        error:
          error instanceof Error ? error.message : "Failed to revoke authority",
      });
    }

    setIsSubmitting(false);
  };

  const handleRevokeMetadataUpdateAuthority = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      updateTokenData({
        error: "Wallet not connected or doesn't support signing",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await revokeMetadataUpdateAuthority(
        wallet,
        connection,
        tokenData.tokenAddress
      );
      updateTokenData({ success: true });
    } catch (error) {
      console.error("Error revoking metadata update authority:", error);
      updateTokenData({
        error:
          error instanceof Error
            ? error.message
            : "Failed to revoke metadata authority",
      });
    }

    setIsSubmitting(false);
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
        <h2 className="text-xl font-semibold">Review & Create</h2>
        <p className="text-sm text-slate-500">
          Review your token details before creating it on the Solana blockchain
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

      {tokenData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tokenData.error}</AlertDescription>
        </Alert>
      )}

      <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="mb-1">
            {process.env.NODE_ENV === "production"
              ? "Your metadata and logo will be uploaded to Arweave via Bundlr Network."
              : "In this preview environment, demo URIs will be used instead of actual Arweave uploads."}
          </p>
          <p className="text-xs">
            {process.env.NODE_ENV === "production"
              ? "This requires a small amount of SOL from your wallet to pay for permanent storage."
              : "In a production environment, this would require a small amount of SOL for storage costs."}
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {tokenData.logoUrl ? (
                <img
                  src={tokenData.logoUrl || "/placeholder.svg"}
                  alt="Token logo"
                  className="w-16 h-16 rounded-full object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  No Logo
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg">
                  {tokenData.name || "Unnamed Token"}
                </h3>
                <p className="text-sm text-slate-500">
                  {tokenData.symbol || "NO SYMBOL"}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Metadata</h4>
              {Object.keys(tokenData.metadata).length > 0 ? (
                <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-xs overflow-auto max-h-40">
                  {JSON.stringify(tokenData.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">No metadata provided</p>
              )}
            </div>

            {tokenData.metadataUri && (
              <div>
                <h4 className="font-medium mb-2">Metadata URI</h4>
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-xs break-all">
                  <span className="text-purple-600">
                    {tokenData.metadataUri}
                    {!tokenData.metadataUri.startsWith("http") && (
                      <span className="ml-2 text-amber-500">
                        (Demo URI for preview)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Distribution</h4>
              {tokenData.recipients.length > 0 ? (
                <div>
                  <p className="text-sm">
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
                </div>
              ) : (
                <p className="text-sm text-slate-500">No recipients added</p>
              )}
            </div>

            {tokenData.success ? (
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-md border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                  <Check className="h-5 w-5" />
                  Token Created Successfully
                </div>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Your token has been created on the Solana blockchain with
                  metadata.
                </p>
                <div className="mt-4 flex flex-col md:flex-row gap-4 items-center">
                  {tokenData.metadata.image && (
                    <img
                      src={tokenData.metadata.image || "/placeholder.svg"}
                      alt={`${tokenData.name} logo`}
                      className="w-20 h-20 rounded-full object-cover border"
                    />
                  )}
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-mono break-all">
                      Token Address: {tokenData.tokenAddress}
                    </p>
                    <p className="text-sm">
                      <a
                        href={getExplorerUrl(tokenData.tokenAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline flex items-center gap-1"
                      >
                        View on Solana Explorer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                    {tokenData.metadataUri &&
                      tokenData.metadataUri.startsWith("http") && (
                        <p className="text-sm">
                          <a
                            href={tokenData.metadataUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-1"
                          >
                            View Token Metadata
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      )}
                    {tokenData.metadata.image &&
                      tokenData.metadata.image.startsWith("http") && (
                        <p className="text-sm">
                          <a
                            href={tokenData.metadata.image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-1"
                          >
                            View Token Image
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      )}

                    <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                      <p className="text-sm font-medium">
                        Network:{" "}
                        {network === WalletAdapterNetwork.Mainnet
                          ? "Mainnet"
                          : "Devnet"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handleRevokeMintAuthority}
                    disabled={
                      !wallet.connected ||
                      !wallet.signTransaction ||
                      isSubmitting
                    }
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4" />
                    )}
                    Revoke Mint Authority
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRevokeMetadataUpdateAuthority}
                    disabled={
                      !wallet.connected ||
                      !wallet.signTransaction ||
                      isSubmitting
                    }
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4" />
                    )}
                    Revoke Metadata Update Authority
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleCreateToken}
                  disabled={
                    tokenData.isCreating ||
                    tokenData.isMinting ||
                    !tokenData.name ||
                    !tokenData.symbol ||
                    !wallet.connected ||
                    !wallet.signTransaction
                  }
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {tokenData.isCreating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {tokenData.isCreating ? "Creating Token..." : "Create Token"}
                </Button>

                {(tokenData.isCreating || tokenData.isMinting) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          creationStep >= 1 ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          creationStep >= 1
                            ? "text-purple-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        Initializing token creation
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          creationStep >= 2 ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          creationStep >= 2
                            ? "text-purple-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        {uploadingImage ? (
                          <span className="flex items-center">
                            Preparing logo...
                            {uploadProgress.image > 0 && (
                              <span className="ml-1">
                                ({uploadProgress.image}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          creationStep >= 2 && "Logo prepared"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          creationStep >= 3 ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          creationStep >= 3
                            ? "text-purple-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        {uploadingMetadata ? (
                          <span className="flex items-center">
                            Preparing metadata...
                            {uploadProgress.metadata > 0 && (
                              <span className="ml-1">
                                ({uploadProgress.metadata}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          creationStep >= 3 && "Metadata prepared"
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          creationStep >= 4 ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          creationStep >= 4
                            ? "text-purple-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        Creating token with on-chain metadata
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          creationStep >= 5 ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          creationStep >= 5
                            ? "text-purple-600 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        Token created
                      </span>
                    </div>
                    {tokenData.recipients.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              creationStep >= 6
                                ? "bg-purple-600"
                                : "bg-slate-300"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              creationStep >= 6
                                ? "text-purple-600 font-medium"
                                : "text-slate-500"
                            }`}
                          >
                            Minting tokens to recipients
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              creationStep >= 7
                                ? "bg-purple-600"
                                : "bg-slate-300"
                            }`}
                          />
                          <span
                            className={`text-sm ${
                              creationStep >= 7
                                ? "text-purple-600 font-medium"
                                : "text-slate-500"
                            }`}
                          >
                            Distribution complete
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
