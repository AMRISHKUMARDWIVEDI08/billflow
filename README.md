# FlowProof

**payments you can prove.**

FlowProof is a non-custodial payment verification workspace for real USDC transfers on Arc Testnet.

## What it does

1. Connect an EVM wallet.
2. Create a payment request with an amount, recipient and reference.
3. Share the generated request URL.
4. Pay the request with real Arc Testnet USDC.
5. Verify a transaction directly against Arc RPC.
6. Mark a payment verified only when the transaction, network, token, amount and recipient all match.

## Verification model

FlowProof does not ship with fake transaction history or simulated settlement. Verification reads the transaction receipt and the USDC `Transfer` event from Arc Testnet.

A payment is considered verified only when:

- the transaction receipt succeeds;
- the transaction is on Arc Testnet;
- the Arc USDC contract matches;
- the transferred amount matches the request;
- the on-chain recipient matches the request.

## Arc Testnet

- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- USDC: `0x3600000000000000000000000000000000000000`

Use test USDC only. Never enter a private key or seed phrase into the application.

## Stack

- Next.js 16
- React 19
- TypeScript / JavaScript
- Tailwind CSS 4
- Wagmi
- Viem
- RainbowKit

## Development

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000`.

## Project status

The current MVP is built in the `flowproof-mvp` branch. Production deployment remains separate until the real Arc Testnet payment path has been manually exercised with a funded test wallet.

## Builder

**AMRISH KUMAR DWIVEDI**
