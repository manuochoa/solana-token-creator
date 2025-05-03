export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Solana Token Creator",
  description:
    "A user-friendly web application for creating and distributing SPL tokens using the **Token-2022** program on the Solana blockchain, with integrated support for on-chain metadata and permanent storage.",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
  ],
  links: {
    twitter: "https://x.com/FuegoLabz",
    docs: "",
  },
  authors: [{ name: "Fuego Labz", url: "https://fuegolabz.io" }],
  creator: "Fuego Labz",
  publisher: "Fuego Labz",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Solana Token Creator",
    description:
      "A user-friendly web application for creating and distributing SPL tokens using the **Token-2022** program on the Solana blockchain, with integrated support for on-chain metadata and permanent storage.",
    url: "https://token-creator.fuegolabz.io",
    siteName: "Solana Token Creator",
    images: [{ url: "/logo.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Solana Token Creator",
    description:
      "A user-friendly web application for creating and distributing SPL tokens using the **Token-2022** program on the Solana blockchain, with integrated support for on-chain metadata and permanent storage.",
    creator: "@FuegoLabz",
    images: ["/logo.png"],
  },
  keywords: [
    "Solana",
    "SPL",
    "Token22",
    "Token-2022",
    "Token Creator",
    "Token Mint",
    "Token Metadata",
    "Arweave",
    "Bundlr",
    "Fuego Labz",
    "memecoin",
    "crypto",
  ],
};
