"use client";

import { useBalance } from "wagmi";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const ARC_TESTNET_ID = 5042002;

export function useUSDCBalance(address: `0x${string}` | undefined) {
  const result = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: ARC_TESTNET_ID,
    query: { enabled: Boolean(address) },
  });

  return {
    balance: result.data?.formatted || "0",
    symbol: result.data?.symbol || "USDC",
    loading: result.isLoading,
    refetch: result.refetch,
  };
}
