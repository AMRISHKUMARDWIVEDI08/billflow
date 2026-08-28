"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { isAddress, parseEventLogs, parseGwei, parseUnits, recoverMessageAddress } from "viem";
import { arcTestnet } from "@/lib/wagmi-config";

const USDC = "0x3600000000000000000000000000000000000000";
const transferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

function encodeRequest(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeRequest(value) {
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return null;
  }
}

function requestMessage(payload) {
  return `FlowProof Payment Request v1\n${JSON.stringify(payload)}`;
}

function shortAddress(value) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";
}

async function signWithInjectedWallet(message, address) {
  const ethereum = typeof window !== "undefined" ? window.ethereum : undefined;
  if (!ethereum?.request) return null;
  const result = await ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });
  return typeof result === "string" ? result : null;
}

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, data: txHash, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    token: USDC,
    chainId: arcTestnet.id,
    query: { enabled: Boolean(address) },
  });

  const [mode, setMode] = useState("create");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [requestUrl, setRequestUrl] = useState("");
  const [request, setRequest] = useState(null);
  const [requestTrusted, setRequestTrusted] = useState(false);
  const [verifyHash, setVerifyHash] = useState("");
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadRequest = async () => {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("request");
      if (!encoded) return;
      const decoded = decodeRequest(encoded);
      if (!decoded?.amount || !decoded?.recipient || !decoded?.signature || decoded.token?.toLowerCase() !== USDC.toLowerCase() || decoded.network !== "arc-testnet" || !isAddress(decoded.recipient)) {
        if (!cancelled) setNotice("invalid or unsigned payment request.");
        return;
      }
      try {
        const signedPayload = {
          version: decoded.version,
          network: decoded.network,
          token: decoded.token,
          amount: decoded.amount,
          recipient: decoded.recipient,
          reference: decoded.reference,
          description: decoded.description,
          createdAt: decoded.createdAt,
        };
        const signer = await recoverMessageAddress({ message: requestMessage(signedPayload), signature: decoded.signature });
        const trusted = signer.toLowerCase() === decoded.recipient.toLowerCase();
        if (!cancelled && trusted) {
          setRequest(decoded);
          setRequestTrusted(true);
          setRequestUrl(window.location.href);
          setMode("pay");
        } else if (!cancelled) {
          setNotice("payment request signature does not match its recipient.");
        }
      } catch {
        if (!cancelled) setNotice("payment request signature could not be verified.");
      }
    };
    loadRequest();
    return () => { cancelled = true; };
  }, []);

  const amountUnits = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 6) : 0n;
    } catch {
      return null;
    }
  }, [amount]);

  const createRequest = async () => {
    setNotice("");
    if (!isConnected || !address) return setNotice("connect your Arc wallet first.");
    if (chainId !== arcTestnet.id) return setNotice("switch your wallet to Arc Testnet.");
    if (!amountUnits || amountUnits <= 0n) return setNotice("enter a valid USDC amount.");
    if (!invoiceNumber.trim()) return setNotice("enter an invoice or payment reference.");

    setBusy(true);
    setNotice("opening your wallet to sign the payment request…");
    try {
      const payload = {
        version: 1,
        network: "arc-testnet",
        token: USDC,
        amount,
        recipient: address,
        reference: invoiceNumber.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };
      let signature;
      try {
        signature = await signMessageAsync({ message: requestMessage(payload) });
      } catch (primaryError) {
        signature = await signWithInjectedWallet(requestMessage(payload), address);
        if (!signature) throw primaryError;
      }
      const signedPayload = { ...payload, signature };
      const url = `${window.location.origin}/?request=${encodeRequest(signedPayload)}`;
      setRequestUrl(url);
      setRequest(signedPayload);
      setRequestTrusted(true);
      setMode("pay");
      setNotice("signed payment request created. changing its terms invalidates the signature.");
    } catch (error) {
      setNotice(error?.shortMessage || error?.message || "request signature was rejected or the wallet did not respond.");
    } finally {
      setBusy(false);
    }
  };

  const payRequest = async () => {
    if (!request || !requestTrusted) return setNotice("payment request is not cryptographically trusted.");
    setNotice("");
    if (!isConnected || !address) return setNotice("connect your wallet first.");
    if (chainId !== arcTestnet.id) {
      try {
        await switchChainAsync({ chainId: arcTestnet.id });
      } catch (error) {
        return setNotice(error?.shortMessage || "switch to Arc Testnet was rejected.");
      }
      return;
    }
    try {
      setBusy(true);
      const value = parseUnits(request.amount, 6);
      const currentGasPrice = publicClient ? await publicClient.getGasPrice() : parseGwei("20");
      const maxFeePerGas = currentGasPrice > parseGwei("20") ? currentGasPrice : parseGwei("20");
      await writeContractAsync({
        address: USDC,
        abi: transferAbi,
        functionName: "transfer",
        args: [request.recipient, value],
        maxFeePerGas,
        maxPriorityFeePerGas: 0n,
      });
    } catch (error) {
      setNotice(error?.shortMessage || error?.message || "transaction was rejected.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      refetchBalance();
      setNotice("transaction confirmed on Arc. you can now verify the payment evidence.");
    }
  }, [isConfirmed, refetchBalance]);

  const verifyPayment = async () => {
    setNotice("");
    setVerification(null);
    if (!publicClient) return setNotice("Arc RPC is not available yet.");
    if (!request || !requestTrusted) return setNotice("a signed payment request is required for verification.");
    if (!verifyHash.trim().startsWith("0x")) return setNotice("enter the transaction hash.");

    try {
      setBusy(true);
      const hash = verifyHash.trim();
      const [tx, receipt] = await Promise.all([
        publicClient.getTransaction({ hash }),
        publicClient.getTransactionReceipt({ hash }),
      ]);
      const logs = parseEventLogs({ abi: transferAbi, logs: receipt.logs, eventName: "Transfer", strict: false });
      const usdcTransfers = logs.filter((log) => log.address.toLowerCase() === USDC.toLowerCase());
      const transfer = usdcTransfers.length === 1 ? usdcTransfers[0] : null;
      const expectedAmount = parseUnits(request.amount, 6);
      const amountMatch = Boolean(transfer && transfer.args.value === expectedAmount);
      const recipientMatch = Boolean(transfer && transfer.args.to?.toLowerCase() === request.recipient.toLowerCase());
      const senderMatch = Boolean(transfer && transfer.args.from?.toLowerCase() === tx.from.toLowerCase());
      const tokenMatch = Boolean(transfer && transfer.address.toLowerCase() === USDC.toLowerCase());
      const directUsdcCall = tx.to?.toLowerCase() === USDC.toLowerCase();
      const success = receipt.status === "success";
      const networkMatch = tx.chainId === arcTestnet.id;
      const signedPayload = {
        version: request.version,
        network: request.network,
        token: request.token,
        amount: request.amount,
        recipient: request.recipient,
        reference: request.reference,
        description: request.description,
        createdAt: request.createdAt,
      };
      const signer = await recoverMessageAddress({ message: requestMessage(signedPayload), signature: request.signature });
      const requestAuthentic = signer.toLowerCase() === request.recipient.toLowerCase();
      const verified = Boolean(success && networkMatch && directUsdcCall && tokenMatch && amountMatch && recipientMatch && senderMatch && requestAuthentic);

      setVerification({
        verified,
        success,
        networkMatch,
        directUsdcCall,
        tokenMatch,
        amountMatch,
        recipientMatch,
        senderMatch,
        requestAuthentic,
        sender: transfer?.args.from || tx.from,
        recipient: transfer?.args.to || tx.to,
        amount: transfer ? Number(transfer.args.value) / 1_000_000 : null,
        blockNumber: receipt.blockNumber.toString(),
        hash,
      });
      setNotice(verified ? "payment independently verified from Arc transaction evidence." : "transaction found, but one or more security checks did not match.");
    } catch (error) {
      setNotice(error?.shortMessage || error?.message || "could not verify this transaction on Arc.");
    } finally {
      setBusy(false);
    }
  };

  const explorerUrl = txHash ? `${arcTestnet.blockExplorers.default.url}/tx/${txHash}` : null;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="brand-mark">FP</div><div><strong>FlowProof</strong><span>payment evidence on Arc</span></div></div><ConnectButton chainStatus="icon" showBalance={false} /></header>
      <section className="hero"><div className="eyebrow">ARC TESTNET · REAL USDC · NON-CUSTODIAL</div><h1>verify the payment, not the screenshot.</h1><p>create a signed payment request, settle it with real USDC, then prove the amount, recipient, token and transaction status directly from Arc.</p><div className="hero-actions"><button className={mode === "create" ? "primary" : "secondary"} onClick={() => setMode("create")}>Create request</button><button className={mode === "verify" ? "primary" : "secondary"} onClick={() => setMode("verify")}>Verify payment</button></div></section>
      <section className="status-strip"><div><span className="dot live" /> Arc Testnet</div><div>Chain <b>5042002</b></div><div>USDC <b>{balance?.formatted || "—"}</b></div><div>Wallet <b>{shortAddress(address)}</b></div></section>
      {notice && <div className="notice">{notice}</div>}

      {mode === "create" && <section className="workspace two-col"><div className="panel"><div className="panel-head"><span>01</span><div><h2>Create signed payment request</h2><p>the connected wallet signs the request, so amount and recipient cannot be silently edited later.</p></div></div><label>Invoice / reference<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001" /></label><label>Amount (USDC)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" /></label><label>Recipient wallet<input value={address || ""} readOnly placeholder="connect wallet first" /></label><label>Description <span className="optional">optional</span><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="website development" /></label><button type="button" className="primary wide" onClick={createRequest} disabled={busy}>{busy ? "opening wallet…" : "Create signed payment link"}</button></div><div className="panel evidence-panel"><div className="panel-head"><span>02</span><div><h2>What gets verified</h2><p>nothing here is pre-filled with fake transaction history.</p></div></div><div className="checks"><div><b>request signature</b><span>recipient-signed payment terms</span></div><div><b>amount</b><span>expected vs actual Transfer value</span></div><div><b>recipient</b><span>signed wallet vs on-chain destination</span></div><div><b>token</b><span>Arc USDC contract address</span></div><div><b>transaction</b><span>receipt, chain, sender and block</span></div></div><div className="truth">REAL DATA ONLY <span>•</span> verification reads Arc RPC</div></div></section>}

      {mode === "pay" && request && requestTrusted && <section className="workspace two-col"><div className="panel payment-card"><div className="eyebrow">SIGNED PAYMENT REQUEST</div><div className="amount">{request.amount} <span>USDC</span></div><p className="reference">{request.reference}</p>{request.description && <p className="description">{request.description}</p>}<div className="meta-row"><span>Pay to</span><b>{shortAddress(request.recipient)}</b></div><div className="meta-row"><span>Network</span><b>Arc Testnet</b></div><button type="button" className="primary wide" onClick={payRequest} disabled={busy || isWriting || isConfirming}>{isWriting || busy ? "waiting for wallet…" : isConfirming ? "confirming on Arc…" : "Pay with USDC"}</button>{txHash && <div className="tx-result"><span>Transaction</span><a href={explorerUrl} target="_blank" rel="noreferrer">{shortAddress(txHash)}</a></div>}</div><div className="panel"><div className="panel-head"><span>PROOF</span><div><h2>Settlement evidence</h2><p>after payment, verify the transaction against the signed request.</p></div></div><button type="button" className="secondary wide" onClick={() => { setVerifyHash(txHash || ""); setMode("verify"); }}>Open verification</button>{requestUrl && <div className="share-box"><span>Shareable signed request</span><textarea readOnly value={requestUrl} onFocus={(e) => e.target.select()} /></div>}</div></section>}

      {mode === "verify" && <section className="workspace two-col"><div className="panel"><div className="panel-head"><span>VERIFY</span><div><h2>Verify a transaction</h2><p>provide a real Arc transaction hash. FlowProof reads the receipt and USDC Transfer event.</p></div></div>{request && requestTrusted && <div className="request-context"><span>Against signed request</span><b>{request.reference} · {request.amount} USDC</b><small>{request.recipient}</small></div>}{!requestTrusted && <div className="empty">Open a valid signed payment request first.</div>}<label>Transaction hash<input value={verifyHash} onChange={(e) => setVerifyHash(e.target.value)} placeholder="0x…" /></label><button type="button" className="primary wide" onClick={verifyPayment} disabled={busy || !requestTrusted}>{busy ? "reading Arc…" : "Verify on Arc"}</button></div><div className="panel"><div className="panel-head"><span>RESULT</span><div><h2>Verification result</h2><p>every security check must pass before FlowProof says verified.</p></div></div>{!verification ? <div className="empty">No verification run yet.<br /><span>Paste a real transaction hash to begin.</span></div> : <div className="verification-result"><div className={verification.verified ? "result-banner verified" : "result-banner failed"}>{verification.verified ? "VERIFIED PAYMENT" : "NOT VERIFIED"}</div><div className="checks compact"><div><b>transaction success</b><span>{verification.success ? "PASS" : "FAIL"}</span></div><div><b>Arc network</b><span>{verification.networkMatch ? "PASS" : "FAIL"}</span></div><div><b>direct USDC call</b><span>{verification.directUsdcCall ? "PASS" : "FAIL"}</span></div><div><b>USDC token</b><span>{verification.tokenMatch ? "PASS" : "FAIL"}</span></div><div><b>amount match</b><span>{verification.amountMatch ? "PASS" : "FAIL"}</span></div><div><b>recipient match</b><span>{verification.recipientMatch ? "PASS" : "FAIL"}</span></div><div><b>sender match</b><span>{verification.senderMatch ? "PASS" : "FAIL"}</span></div><div><b>signed request</b><span>{verification.requestAuthentic ? "PASS" : "FAIL"}</span></div></div><div className="proof-details"><div><span>Sender</span><b>{shortAddress(verification.sender)}</b></div><div><span>Recipient</span><b>{shortAddress(verification.recipient)}</b></div><div><span>Amount</span><b>{verification.amount ?? "—"} USDC</b></div><div><span>Block</span><b>{verification.blockNumber}</b></div></div><a className="explorer-link" href={`${arcTestnet.blockExplorers.default.url}/tx/${verification.hash}`} target="_blank" rel="noreferrer">view transaction evidence on ArcScan ↗</a></div>}</div></section>}

      <footer><span>FlowProof</span><span>Arc Testnet · test USDC only</span><span>no custody · no fake history</span></footer>
    </main>
  );
}
