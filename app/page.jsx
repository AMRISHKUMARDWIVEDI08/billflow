"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isAddress, parseUnits } from "viem";
import { arcTestnet } from "@/lib/wagmi-config";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_DECIMALS = 6;
const erc20Abi = [{ name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }];
const categories = [
  { key: "grocery", label: "Groceries", icon: "🛒" },
  { key: "electricity", label: "Electricity", icon: "⚡" },
  { key: "internet", label: "Internet", icon: "🌐" },
  { key: "rent", label: "Rent", icon: "🏠" },
  { key: "school", label: "School", icon: "🎓" },
  { key: "insurance", label: "Insurance", icon: "🛡️" },
];

function shortAddress(value) {
  if (!value) return "—";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(Number(value || 0));
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isWalletPending } = useWriteContract();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [billName, setBillName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("others");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [txHash, setTxHash] = useState();
  const [activity, setActivity] = useState([]);
  const [showReceive, setShowReceive] = useState(false);

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({ address, token: USDC_ADDRESS, chainId: arcTestnet.id, query: { enabled: Boolean(address) } });
  const { isLoading: receiptLoading, isSuccess: receiptSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const onArc = chainId === arcTestnet.id;
  const busy = isWalletPending || receiptLoading;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("billflow-activity");
      if (saved) setActivity(JSON.parse(saved));
    } catch {
      // Ignore malformed local activity.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("billflow-activity", JSON.stringify(activity.slice(0, 20)));
  }, [activity]);

  useEffect(() => {
    if (!receiptSuccess || !txHash) return;
    const entry = { id: txHash, title: billName.trim() || "USDC payment", category: selectedCategory, amount, hash: txHash, timestamp: new Date().toISOString() };
    setActivity((current) => [entry, ...current.filter((item) => item.hash !== txHash)].slice(0, 20));
    setRecipient("");
    setAmount("");
    setBillName("");
    setNotice("Payment confirmed on Arc.");
    setError("");
    refetchBalance();
  }, [receiptSuccess, txHash, billName, selectedCategory, amount, refetchBalance]);

  const balance = balanceData?.formatted || "0";
  const totalLocalSpend = useMemo(() => activity.reduce((sum, item) => sum + Number(item.amount || 0), 0), [activity]);

  async function handlePayment(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!isConnected || !address) return setError("Connect your wallet first.");
    if (!onArc) {
      try { await switchChainAsync({ chainId: arcTestnet.id }); } catch { setError("Switch to Arc Testnet in your wallet to continue."); }
      return;
    }
    if (!isAddress(recipient)) return setError("Enter a valid recipient wallet address.");
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError("Enter a payment amount greater than 0 USDC.");
    if (balanceData && numericAmount > Number(balanceData.formatted)) return setError("Insufficient USDC balance.");
    try {
      const hash = await writeContractAsync({ address: USDC_ADDRESS, abi: erc20Abi, functionName: "transfer", args: [recipient, parseUnits(amount, USDC_DECIMALS)] });
      setTxHash(hash);
      setNotice("Transaction submitted. Waiting for Arc confirmation…");
    } catch (paymentError) {
      console.error(paymentError);
      setError("Transaction was rejected or could not be submitted. No payment was recorded.");
    }
  }

  function chooseCategory(category) {
    setSelectedCategory(category.key);
    setBillName(category.label);
    setNotice("");
    setError("");
    document.getElementById("payment-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function copyAddress() {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); setNotice("Wallet address copied."); }
    catch { setError("Could not copy the address. You can select it manually."); }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-wrap"><div className="brand-mark">B</div><div><div className="brand-name">BillFlow</div><div className="brand-subtitle">simple USDC payments on Arc</div></div></div>
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} />
      </header>

      <section className="hero-grid">
        <div className="hero-card">
          <div className="eyebrow">YOUR BALANCE</div>
          <div className="balance-row"><span className="balance-value">{isConnected ? (balanceLoading ? "…" : formatAmount(balance)) : "0.00"}</span><span className="currency">USDC</span></div>
          <div className="wallet-line">{isConnected ? shortAddress(address) : "Wallet not connected"}{isConnected && <span className={onArc ? "status-dot online" : "status-dot"}>{onArc ? "Arc Testnet" : "Wrong network"}</span>}</div>
        </div>
        <div className="stats-card"><div className="stat-item"><span>Payments recorded</span><strong>{activity.length}</strong></div><div className="stat-divider" /><div className="stat-item"><span>Session spend</span><strong>{formatAmount(totalLocalSpend)} <small>USDC</small></strong></div></div>
      </section>

      {!isConnected && <section className="connect-banner"><div><strong>Connect your wallet to start.</strong><span>BillFlow never asks for your seed phrase or private key.</span></div><ConnectButton label="Connect wallet" /></section>}
      {isConnected && !onArc && <section className="warning-banner"><div><strong>Arc Testnet required</strong><span>Your wallet is connected to another network.</span></div><button className="secondary-button" onClick={() => switchChainAsync({ chainId: arcTestnet.id })}>Switch to Arc</button></section>}

      <section className="section-head"><div><div className="eyebrow">QUICK PAYMENTS</div><h2>What are you paying?</h2></div><span className="muted">Choose a category, then confirm the recipient and amount.</span></section>
      <section className="category-grid">{categories.map((category) => <button key={category.key} className="category-card" onClick={() => chooseCategory(category)}><span className="category-icon">{category.icon}</span><span>{category.label}</span></button>)}</section>

      <section id="payment-form" className="panel payment-panel">
        <div className="panel-heading"><div><div className="eyebrow">PAYMENT</div><h2>Send USDC</h2></div><span className="network-pill">Arc Testnet</span></div>
        <form onSubmit={handlePayment} className="payment-form">
          <label>Bill or payment name<input value={billName} onChange={(event) => setBillName(event.target.value)} placeholder="e.g. electricity bill" maxLength={80} /></label>
          <label>Recipient wallet address<input value={recipient} onChange={(event) => setRecipient(event.target.value.trim())} placeholder="0x…" inputMode="text" autoComplete="off" /></label>
          <label>Amount<div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" min="0" step="0.000001" /><span>USDC</span></div></label>
          {error && <div className="message error">{error}</div>}
          {notice && <div className="message success">{notice}</div>}
          <button className="primary-button" disabled={busy || !isConnected}>{isWalletPending ? "Confirm in wallet…" : receiptLoading ? "Confirming on Arc…" : "Review & pay"}</button>
        </form>
        <p className="security-note">You approve every transaction in your wallet. BillFlow cannot move funds without your wallet signature.</p>
      </section>

      <section className="receive-row"><div><div className="eyebrow">RECEIVE</div><h2>Get paid to your wallet</h2><p className="muted">Share your Arc wallet address when someone needs to send you USDC.</p></div><button className="secondary-button" onClick={() => setShowReceive((value) => !value)} disabled={!isConnected}>{showReceive ? "Hide address" : "Show address"}</button></section>
      {showReceive && isConnected && <section className="panel receive-panel"><div className="address-box">{address}</div><div className="receive-actions"><button className="secondary-button" onClick={copyAddress}>Copy address</button><a className="text-link" href={`https://testnet.arcscan.app/address/${address}`} target="_blank" rel="noreferrer">View on explorer ↗</a></div></section>}

      <section className="section-head history-head"><div><div className="eyebrow">ACTIVITY</div><h2>Recent payments</h2></div><span className="muted">Saved locally after confirmed transactions.</span></section>
      <section className="panel activity-panel">{activity.length === 0 ? <div className="empty-state"><div className="empty-icon">↗</div><strong>No payments yet</strong><span>Your confirmed BillFlow payments will appear here.</span></div> : activity.map((item) => <div className="activity-item" key={item.hash}><div className="activity-icon">✓</div><div className="activity-main"><strong>{item.title}</strong><span>{new Date(item.timestamp).toLocaleString()} · {shortAddress(item.hash)}</span></div><div className="activity-amount">-{formatAmount(item.amount)} USDC</div></div>)}</section>

      <footer className="footer"><span>BillFlow</span><span>Built on Arc · Testnet</span><a href="https://docs.arc.io/" target="_blank" rel="noreferrer">Arc docs ↗</a></footer>
    </main>
  );
}
