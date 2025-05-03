# Solana Token Creator

A user-friendly web application for creating and distributing SPL tokens using the **Token-2022** program on the Solana blockchain, with integrated support for on-chain metadata and permanent storage.

## Features

- **Token-2022 Standard**: Create SPL tokens using the latest Token Extensions with native metadata support via `MetadataPointer` and `TokenMetadata`
- **No Metaplex Dependency**: Metadata is no longer managed using the deprecated Metaplex Metadata program
- **Bundlr & Arweave**: Upload token logos and metadata directly to Arweave using [Bundlr Network](https://bundlr.network/), paid in SOL
- **Direct Minting**: Mint tokens directly to multiple wallet addresses from a CSV file
- **Security Options**: Optionally revoke mint and metadata authorities for truly immutable tokens
- **Devnet Support**: Works on devnet and mainnet (note: Arweave uploads may be unreliable on devnet)
- **User-Friendly Interface**: Intuitive and guided token creation flow

## Technologies Used

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Blockchain**: Solana Web3.js, SPL Token-2022 Extensions
- **Storage**: Arweave via Bundlr Network (using SOL)
- **UI Components**: [radix-ui](https://www.radix-ui.com/) - [shadcn/ui](https://ui.shadcn.com/)

## Prerequisites

- Node.js 16+ and npm/yarn
- A Solana wallet (e.g. Phantom) installed in your browser
- SOL tokens for transaction fees and Arweave uploads

## Installation

```bash
git clone https://github.com/manuochoa/solana-token-creator.git
cd solana-token-creator

npm install
# or
yarn install
```

### Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### 1. Connect Wallet

Click **Connect Wallet** to authorize the app.

### 2. Token Details

Input the basic properties of your token:

- **Token Name**
- **Token Symbol**

### 3. Token Logo

Upload an image. It will be uploaded to Arweave and linked in your metadata.

### 4. Metadata

- **Description**
- **External URL**
- Arweave-hosted image will be used automatically after upload

### 5. Token Distribution

Upload a CSV with recipient addresses and amounts for each. The minting is done directly to each address (not a transfer from the token creator).

### 6. Review & Create

Finalize your token settings:

- **Revoke Mint Authority**
- **Revoke Metadata Authority**

Click **Create Token** to launch it on-chain.

## Security Options

- **Revoke Mint Authority**: Locks the supply forever
- **Revoke Metadata Authority**: Prevents any future changes to metadata

## Notes

- Fully functional on **mainnet** with Bundlr + Arweave for permanent storage (paid in SOL)
- **Devnet** is supported, but Arweave uploads may intermittently fail due to bundlr devnet node reliability

## Contributing

Pull requests are welcome.

1. Fork the repository
2. Create your feature branch `git checkout -b feature/amazing-feature`
3. Commit your changes `git commit -m 'commit messages are always hard'`
4. Push to the branch `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License – see `LICENSE` file.

## Acknowledgments

- [Solana](https://solana.com/)
- [SPL-Token-Program](https://spl.solana.com/token-2022)
- [Arweave](https://www.arweave.org/)
- [Bundlr Network](https://bundlr.network/)
- [radix-ui](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)
