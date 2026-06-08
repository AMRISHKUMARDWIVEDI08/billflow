#!/bin/bash

echo "🛑 Step 1: Stopping all old running servers..."
pkill -9 node
rm -rf .next .turbo

echo "📂 Step 2: Re-creating absolute safe folders..."
mkdir -p hooks lib providers app/components

echo "⚙️ Step 3: Injecting wagmi-config.ts..."
cat << 'INNER' > lib/wagmi-config.ts
"use client"
import "@rainbow-me/rainbowkit/styles.css"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"
import { defineChain } from "viem"

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.network" } },
  testnet: true,
})

export const wagmiConfig = getDefaultConfig({
  appName: "AXON402",
  projectId: "a0031066837361c93d02ae2f139acc98",
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http("https://rpc.testnet.arc.network") },
  ssr: false,
})
INNER

echo "⚙️ Step 4: Injecting wallet-provider.jsx..."
cat << 'INNER' > providers/wallet-provider.jsx
"use client"
import "@rainbow-me/rainbowkit/styles.css"
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { wagmiConfig } from "@/lib/wagmi-config"

const queryClient = new QueryClient()

export function WalletProvider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
INNER

echo "⚙️ Step 5: Injecting use-usdc-balance.ts..."
cat << 'INNER' > hooks/use-usdc-balance.ts
"use client"
import { useBalance } from "wagmi"

export function useUSDCBalance(address: `0x${string}` | undefined) {
  const result = useBalance({
    address,
    token: "0x3600000000000000000000000000000000000000",
    chainId: 5042002,
  })
  return {
    balance: result.data?.formatted || "0",
    symbol: result.data?.symbol || "USDC",
    loading: result.isLoading
  }
}
INNER

echo "⚙️ Step 6: Injecting root layout.jsx..."
cat << 'INNER' > app/layout.jsx
import "./globals.css"
import { WalletProvider } from "@/providers/wallet-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  )
}
INNER

echo "⚙️ Step 7: Injecting connect-wallet.jsx..."
cat << 'INNER' > app/components/connect-wallet.jsx
"use client"
import { ConnectButton } from "@rainbow-me/rainbowkit"
export default function ConnectWallet() { return <ConnectButton /> }
INNER

echo "⚙️ Step 8: Injecting app/page.jsx dashboard..."
cat << 'INNER' > app/page.jsx
"use client"
import ConnectWallet from "./components/connect-wallet"
import { useAccount } from "wagmi"
import { useUSDCBalance } from "@/hooks/use-usdc-balance"

export default function Home() {
  const { address, isConnected } = useAccount()
  const { balance, symbol, loading } = useUSDCBalance(address)

  return (
    <main className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-6 bg-zinc-900 rounded-3xl border border-zinc-800 text-center space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">AXON402 Infra 🚀</h1>
        <p className="text-xs text-zinc-500">BillFlow Powered Dashboard</p>
        <hr className="border-zinc-800" />
        <div className="flex justify-center"><ConnectWallet /></div>
        {isConnected && (
          <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-left space-y-2">
            <p className="text-xs text-zinc-500 font-mono truncate"><b>Wallet:</b> {address}</p>
            <div className="pt-2 border-t border-zinc-900">
              <p className="text-xs text-zinc-500 font-semibold uppercase">USDC Balance</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {loading ? "Loading..." : `${balance} ${symbol}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
INNER

echo "✅ Script complete! Executing clean server restart..."
npm run dev
