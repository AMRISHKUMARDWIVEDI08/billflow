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
