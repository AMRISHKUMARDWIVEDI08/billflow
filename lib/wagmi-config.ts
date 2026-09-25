"use client";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

export const wagmiConfig = getDefaultConfig({
  appName: "FlowProof",
  projectId: "a0031066837361c93d02ae2f139acc98",
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http("https://rpc.testnet.arc.io") },
  ssr: false,
});
