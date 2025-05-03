"use client";

import type React from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Upload,
  FileJson,
  Info,
  ImageIcon,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TokenMetadataProps {
  tokenData: {
    metadata: Record<string, any>;
    metadataUri: string;
    logoUrl: string;
    logoFile?: File;
    [key: string]: any;
  };
  updateTokenData: (
    data: Partial<{
      metadata: Record<string, any>;
      metadataUri: string;
      logoUrl: string;
      logoFile?: File;
    }>
  ) => void;
  network?: WalletAdapterNetwork;
}

export default function TokenMetadata({
  tokenData,
  updateTokenData,
  network = WalletAdapterNetwork.Devnet,
}: TokenMetadataProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [fileError, setFileError] = useState("");
  const [attributes, setAttributes] = useState<
    Array<{ trait_type: string; value: string }>
  >(tokenData.metadata.attributes || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setJsonError("");
  };

  const parseJson = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonError("Please enter JSON data");
        return;
      }

      const parsed = JSON.parse(jsonInput);
      updateTokenData({ metadata: parsed });

      if (parsed.attributes && Array.isArray(parsed.attributes)) {
        setAttributes(parsed.attributes);
      }

      setJsonError("");
    } catch (error) {
      setJsonError("Invalid JSON format");
    }
  };

  const addAttribute = () => {
    const newAttributes = [...attributes, { trait_type: "", value: "" }];
    setAttributes(newAttributes);

    const metadata = { ...tokenData.metadata, attributes: newAttributes };
    updateTokenData({ metadata });
  };

  const updateAttribute = (
    index: number,
    field: "trait_type" | "value",
    value: string
  ) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);

    const metadata = { ...tokenData.metadata, attributes: newAttributes };
    updateTokenData({ metadata });
  };

  const removeAttribute = (index: number) => {
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);

    const metadata = { ...tokenData.metadata, attributes: newAttributes };
    updateTokenData({ metadata });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setFileError("Only JSON files are supported");
      return;
    }

    setIsUploading(true);
    setFileError("");

    try {
      const text = await file.text();
      const metadata = JSON.parse(text);

      const enhancedMetadata = {
        name: tokenData.name || metadata.name || "",
        symbol: tokenData.symbol || metadata.symbol || "",
        description: metadata.description || "",
        image: metadata.image || "",
        external_url: metadata.external_url || "",
        ...metadata,
        attributes: metadata.attributes || [],
        properties: {
          ...(metadata.properties || {}),
          files: metadata.properties?.files || [],
          creators: metadata.properties?.creators || [],
        },
      };

      updateTokenData({ metadata: enhancedMetadata });

      setJsonInput(JSON.stringify(enhancedMetadata, null, 2));

      if (
        enhancedMetadata.attributes &&
        Array.isArray(enhancedMetadata.attributes)
      ) {
        setAttributes(enhancedMetadata.attributes);
      }
    } catch (error) {
      setFileError("Failed to parse JSON file. Please check the file format.");
      console.error("Error parsing JSON file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleLogoUpload(e.target.files[0]);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      console.error("File is not an image");
      return;
    }

    setIsUploading(true);

    try {
      const url = URL.createObjectURL(file);

      updateTokenData({
        logoUrl: url,
        logoFile: file,
      });

      updateTokenData({
        metadata: {
          ...tokenData.metadata,
          image: url,
        },
      });
    } catch (error) {
      console.error("Error handling file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    updateTokenData({
      logoUrl: url,
      logoFile: undefined,
      metadata: {
        ...tokenData.metadata,
        image: url,
      },
    });
  };

  const removeLogo = () => {
    if (tokenData.logoUrl && tokenData.logoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(tokenData.logoUrl);
    }

    updateTokenData({
      logoUrl: "",
      logoFile: undefined,
      metadata: {
        ...tokenData.metadata,
        image: "",
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Token Metadata</h2>
        <p className="text-sm text-slate-500">
          Add metadata and logo for your token that will be stored on-chain and
          linked to your token
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="mb-1">
            Your metadata and logo will be uploaded to Arweave via Bundlr
            Network on{" "}
            {network === WalletAdapterNetwork.Mainnet ? "Mainnet" : "Devnet"}.
          </p>
          <p className="text-xs">
            This requires a small amount of SOL from your wallet to pay for
            permanent storage.
            {network === WalletAdapterNetwork.Mainnet && (
              <span className="font-bold ml-1">
                Real SOL will be used on Mainnet.
              </span>
            )}
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Label>Upload Metadata File</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>
                          Upload a JSON file with your token metadata. The file
                          should follow the Metaplex Token Metadata standard.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div>
                  <input
                    type="file"
                    id="metadata-file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label htmlFor="metadata-file">
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      disabled={isUploading}
                      asChild
                    >
                      <div>
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? "Uploading..." : "Upload JSON"}
                      </div>
                    </Button>
                  </label>
                </div>
              </div>

              {fileError && (
                <Alert variant="destructive">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              {Object.keys(tokenData.metadata).length > 0 && (
                <div className="p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Current Metadata</span>
                  </div>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-white dark:bg-slate-800 rounded border">
                    {JSON.stringify(tokenData.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Token Logo</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Upload a logo for your token or provide a URL. The logo
                        will be displayed in wallets and marketplaces.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {tokenData.logoUrl ? (
                <div className="flex flex-col items-center p-4 border rounded-md">
                  <div className="relative">
                    <img
                      src={tokenData.logoUrl || "/placeholder.svg"}
                      alt="Token logo"
                      className="w-32 h-32 rounded-full object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full h-8 w-8"
                      onClick={removeLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">
                    {tokenData.logoFile
                      ? `Your logo "${tokenData.logoFile.name}" will be uploaded to Arweave when creating the token`
                      : "Using logo URL"}
                  </p>
                </div>
              ) : (
                <Tabs
                  defaultValue="upload"
                  value={imageTab}
                  onValueChange={(v) => setImageTab(v as "upload" | "url")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    <TabsTrigger value="url">Provide URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center ${
                        isDragging
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                          : "border-slate-300"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                          <ImageIcon className="h-6 w-6 text-slate-500" />
                        </div>
                        <p className="mb-2 font-medium">
                          Drag and drop your logo here
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          SVG, PNG, or JPG (max. 2MB)
                        </p>
                        <div>
                          <label htmlFor="logo-upload">
                            <Button
                              variant="outline"
                              className="cursor-pointer"
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                "Uploading..."
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Select File
                                </>
                              )}
                            </Button>
                            <input
                              id="logo-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoChange}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                        Arweave Storage Information
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Your image will be permanently stored on Arweave via
                        Bundlr Network. This requires a small amount of SOL from
                        your wallet to pay for storage costs.
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="url">
                    <div className="space-y-2">
                      <Label htmlFor="logo-url">Logo URL</Label>
                      <Input
                        id="logo-url"
                        placeholder="https://example.com/logo.png"
                        onChange={(e) => handleImageUrlChange(e.target.value)}
                      />
                      <p className="text-xs text-slate-500">
                        Enter a URL to your token logo. Make sure the URL is
                        permanent and accessible.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Basic Information</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        These fields are required for your token to display
                        properly in wallets and explorers.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="grid gap-4 mt-2">
                <div className="grid gap-2">
                  <Label htmlFor="metadata-description">Description</Label>
                  <Textarea
                    id="metadata-description"
                    placeholder="A description of your token"
                    value={tokenData.metadata.description || ""}
                    onChange={(e) =>
                      updateTokenData({
                        metadata: {
                          ...tokenData.metadata,
                          description: e.target.value,
                        },
                      })
                    }
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="metadata-external-url">External URL</Label>
                  <Input
                    id="metadata-external-url"
                    placeholder="https://example.com"
                    value={tokenData.metadata.external_url || ""}
                    onChange={(e) =>
                      updateTokenData({
                        metadata: {
                          ...tokenData.metadata,
                          external_url: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attributes</Label>
              <p className="text-xs text-slate-500">
                Add traits and attributes for your token
              </p>

              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    placeholder="Trait name"
                    value={attr.trait_type}
                    onChange={(e) =>
                      updateAttribute(index, "trait_type", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={attr.value}
                    onChange={(e) =>
                      updateAttribute(index, "value", e.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeAttribute(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addAttribute}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Attribute
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="json-metadata">Advanced: JSON Metadata</Label>
              <Textarea
                id="json-metadata"
                placeholder='{"description": "My token description", "external_url": "https://example.com"}'
                rows={6}
                value={jsonInput}
                onChange={handleJsonChange}
                className="font-mono text-sm"
              />
              {jsonError && <p className="text-xs text-red-500">{jsonError}</p>}
              <Button variant="outline" size="sm" onClick={parseJson}>
                Parse JSON
              </Button>
              <p className="text-xs text-slate-500">
                Alternatively, paste your complete JSON metadata here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
