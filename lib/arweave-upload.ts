import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WebBundlr } from "@bundlr-network/client";

export async function uploadImageToArweave(
  imageData: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
  wallet: any,
  network: WalletAdapterNetwork = WalletAdapterNetwork.Devnet
): Promise<string> {
  const bundlrNode =
    network === WalletAdapterNetwork.Mainnet
      ? "https://node1.bundlr.network"
      : "https://devnet.bundlr.network";

  const providerUrl =
    network === WalletAdapterNetwork.Mainnet
      ? "https://proud-soft-emerald.solana-mainnet.quiknode.pro/63e220c97a3db24e0826c67770818749f32d804e/"
      : // ? "https://api.mainnet-beta.solana.com"
        "https://api.devnet.solana.com";

  const bundlr = new WebBundlr(bundlrNode, "solana", wallet, { providerUrl });
  await bundlr.ready();

  const price = await bundlr.getPrice(imageData.byteLength);
  const balance = await bundlr.getLoadedBalance();

  if (balance.isLessThan(price)) {
    const fundAmount = price.minus(balance).multipliedBy(1.1).integerValue();
    await bundlr.fund(fundAmount);
  }

  const tx = bundlr.createTransaction(imageData, {
    tags: [{ name: "Content-Type", value: contentType }],
  });

  await tx.sign();
  const result = await tx.upload();
  if (!result?.id)
    throw new Error("Upload failed or no transaction ID returned.");

  return `https://arweave.net/${result.id}`;
}

export async function uploadMetadataToArweave(
  metadata: Record<string, any>,
  wallet: any,
  network: WalletAdapterNetwork = WalletAdapterNetwork.Devnet
): Promise<string> {
  const bundlrNode =
    network === WalletAdapterNetwork.Mainnet
      ? "https://node1.bundlr.network"
      : "https://devnet.bundlr.network";

  const providerUrl =
    network === WalletAdapterNetwork.Mainnet
      ? "https://proud-soft-emerald.solana-mainnet.quiknode.pro/63e220c97a3db24e0826c67770818749f32d804e/"
      : // ? "https://api.mainnet-beta.solana.com"
        "https://api.devnet.solana.com";

  const bundlr = new WebBundlr(bundlrNode, "solana", wallet, { providerUrl });
  await bundlr.ready();

  const buffer = Buffer.from(JSON.stringify(metadata));
  const price = await bundlr.getPrice(buffer.byteLength);
  const balance = await bundlr.getLoadedBalance();

  if (balance.isLessThan(price)) {
    const fundAmount = price.minus(balance).multipliedBy(1.1).integerValue();
    await bundlr.fund(fundAmount);
  }

  const tx = bundlr.createTransaction(buffer, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  });

  await tx.sign();
  const result = await tx.upload();
  if (!result?.id)
    throw new Error("Metadata upload failed or missing result ID.");

  return `https://arweave.net/${result.id}`;
}
