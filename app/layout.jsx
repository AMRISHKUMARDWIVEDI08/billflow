import "./globals.css";
import { WalletProvider } from "@/providers/wallet-provider";

export const metadata = {
  title: "BillFlow — USDC payments on Arc",
  description: "A simple wallet-first USDC payment experience built on Arc Testnet.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
