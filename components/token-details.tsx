"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

interface TokenDetailsProps {
  tokenData: {
    name: string
    symbol: string
    [key: string]: any
  }
  updateTokenData: (data: Partial<{ name: string; symbol: string }>) => void
}

export default function TokenDetails({ tokenData, updateTokenData }: TokenDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Token Details</h2>
        <p className="text-sm text-slate-500">Enter the basic information for your token</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="e.g., My Awesome Token"
                value={tokenData.name}
                onChange={(e) => updateTokenData({ name: e.target.value })}
              />
              <p className="text-xs text-slate-500">The full name of your token (e.g., "Solana")</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="token-symbol">Token Symbol</Label>
              <Input
                id="token-symbol"
                placeholder="e.g., MAT"
                value={tokenData.symbol}
                onChange={(e) => updateTokenData({ symbol: e.target.value.toUpperCase() })}
                maxLength={10}
              />
              <p className="text-xs text-slate-500">A short symbol for your token (e.g., "SOL"). Max 10 characters.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
