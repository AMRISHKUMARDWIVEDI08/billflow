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
