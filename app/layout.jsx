import "./globals.css";
import { WalletProvider } from "@/providers/wallet-provider";

export const metadata = {
  title: "FlowProof — payment evidence on Arc",
  description: "Create and independently verify real USDC payment requests on Arc Testnet.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><WalletProvider>{children}</WalletProvider></body>
    </html>
  );
}
