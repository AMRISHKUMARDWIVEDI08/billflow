# BillFlow

BillFlow is a wallet-first USDC payment experience built on **Arc Testnet**.

## Product goal

Make a small, understandable payment surface for sending and receiving USDC without pretending that simulated actions are real payments.

## Current product flow

1. Connect an EVM wallet.
2. Detect whether the wallet is on Arc Testnet.
3. Read the connected wallet's USDC balance.
4. Choose a common payment category.
5. Enter a recipient and amount.
6. Validate the address and balance before asking the wallet to sign.
7. Submit a real ERC-20 USDC transfer on Arc.
8. Wait for transaction confirmation before recording the payment locally.
9. Share/copy the wallet address for receiving USDC.
10. Open confirmed transactions in the Arc Testnet explorer.

## Arc-specific implementation

- Arc Testnet chain ID: `5042002`
- Arc Testnet RPC: `https://rpc.testnet.arc.network`
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`
- USDC ERC-20 amount precision: 6 decimals
- Arc native USDC gas uses a different 18-decimal native representation; BillFlow uses the ERC-20 interface for application payments.

## Stack

- Next.js 16
- React 19
- TypeScript/JavaScript
- Tailwind CSS 4
- Wagmi
- Viem
- RainbowKit
- TanStack Query

## Important product rule

BillFlow must never display fake successful transactions, fake balances, or simulated transfers as if they were real. On-chain state is the source of truth for payments; the local activity list is only a convenience record of confirmed payments made through this interface.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Builder

**AMRISH KUMAR DWIVEDI**

[GitHub](https://github.com/AMRISHKUMARDWIVEDI08) · [BillFlow repository](https://github.com/AMRISHKUMARDWIVEDI08/billflow)
