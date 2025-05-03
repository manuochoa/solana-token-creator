import TokenCreator from "@/components/token-creator";
import { ThemeProvider } from "@/components/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TokenMint from "@/components/token-mint";

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Solana Token Creator
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Create and distribute your Solana tokens in minutes
            </p>
          </header>

          <Tabs defaultValue="create" className="mb-8">
            {/* Not using this for now, but later I'll add more tabs for token handling after create */}
            {/* <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create">Create New Token</TabsTrigger>
              <TabsTrigger value="mint">Mint More Tokens</TabsTrigger>
            </TabsList> */}
            <TabsContent value="create">
              <TokenCreator />
            </TabsContent>
            <TabsContent value="mint">
              <TokenMint />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ThemeProvider>
  );
}
